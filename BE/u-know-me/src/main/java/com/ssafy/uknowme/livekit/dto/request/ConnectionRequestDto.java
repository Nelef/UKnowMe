package com.ssafy.uknowme.livekit.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConnectionRequestDto {

    private String roomSeq;

    private String participantIdentity;

    private String participantName;

    private String participantMetadata;

    private String token;
}
