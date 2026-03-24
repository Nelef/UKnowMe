package com.ssafy.uknowme.livekit.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.uknowme.livekit.dto.request.ConnectionRequestDto;
import com.ssafy.uknowme.livekit.dto.response.ConnectionResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
public class SessionController {

    private static final long TOKEN_TTL_SECONDS = 60 * 60;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String liveKitWsUrl;

    private final String liveKitApiKey;

    private final String liveKitApiSecret;

    public SessionController(
            @Value("${livekit.ws-url}") String liveKitWsUrl,
            @Value("${livekit.api-key}") String liveKitApiKey,
            @Value("${livekit.api-secret}") String liveKitApiSecret
    ) {
        this.liveKitWsUrl = liveKitWsUrl;
        this.liveKitApiKey = liveKitApiKey;
        this.liveKitApiSecret = liveKitApiSecret;
    }

    @PostMapping("/session")
    public ResponseEntity<?> connect(@RequestBody ConnectionRequestDto dto) {
        String roomSeq = normalize(dto.getRoomSeq());

        if (roomSeq == null) {
            return new ResponseEntity<>("roomSeq는 비어 있을 수 없습니다.", HttpStatus.BAD_REQUEST);
        }

        String participantIdentity = normalize(dto.getParticipantIdentity());
        if (participantIdentity == null) {
            participantIdentity = UUID.randomUUID().toString();
        }

        String participantName = normalize(dto.getParticipantName());
        if (participantName == null) {
            participantName = participantIdentity;
        }

        String participantMetadata = normalize(dto.getParticipantMetadata());

        String participantToken = createParticipantToken(
                roomSeq,
                participantIdentity,
                participantName,
                participantMetadata
        );

        return new ResponseEntity<>(
                new ConnectionResponseDto(liveKitWsUrl, participantToken),
                HttpStatus.OK
        );
    }

    @DeleteMapping("/session")
    public ResponseEntity<Void> disconnect(@RequestBody(required = false) ConnectionRequestDto dto) {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/session/disconnect")
    public ResponseEntity<Void> disconnectKeepalive(@RequestBody(required = false) ConnectionRequestDto dto) {
        return ResponseEntity.noContent().build();
    }

    private String createParticipantToken(
            String roomSeq,
            String participantIdentity,
            String participantName,
            String participantMetadata
    ) {
        long now = Instant.now().getEpochSecond();

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("iss", liveKitApiKey);
        payload.put("sub", participantIdentity);
        payload.put("nbf", now);
        payload.put("exp", now + TOKEN_TTL_SECONDS);
        payload.put("name", participantName);

        if (participantMetadata != null) {
            payload.put("metadata", participantMetadata);
        }

        Map<String, Object> video = new LinkedHashMap<>();
        video.put("roomJoin", true);
        video.put("room", roomSeq);
        video.put("canPublish", true);
        video.put("canPublishData", true);
        video.put("canSubscribe", true);
        payload.put("video", video);

        try {
            String encodedHeader = encodeJson(header);
            String encodedPayload = encodeJson(payload);
            String signingInput = encodedHeader + "." + encodedPayload;
            return signingInput + "." + sign(signingInput);
        } catch (Exception exception) {
            throw new IllegalStateException("LiveKit participant token을 생성하지 못했습니다.", exception);
        }
    }

    private String encodeJson(Map<String, Object> source) throws Exception {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(source));
    }

    private String sign(String signingInput) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
                liveKitApiSecret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
        mac.init(keySpec);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
