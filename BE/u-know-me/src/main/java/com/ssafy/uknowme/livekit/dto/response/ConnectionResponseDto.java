package com.ssafy.uknowme.livekit.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConnectionResponseDto {

    private String serverUrl;

    private String participantToken;
}
