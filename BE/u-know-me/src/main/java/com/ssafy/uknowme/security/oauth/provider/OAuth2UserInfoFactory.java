package com.ssafy.uknowme.security.oauth.provider;

import com.ssafy.uknowme.security.oauth.type.ProviderType;
import com.ssafy.uknowme.security.oauth.provider.impl.KakaoOAuth2UserInfo;
import com.ssafy.uknowme.security.oauth.provider.impl.NaverOAuth2UserInfo;

import java.util.Map;

public class OAuth2UserInfoFactory {
    public static OAuth2UserInfo getOAuth2UserInfo(ProviderType providerType, Map<String, Object> attributes) {
        switch (providerType) {
            case NAVER: return new NaverOAuth2UserInfo(attributes);
            case KAKAO: return new KakaoOAuth2UserInfo(attributes);
            default: throw new IllegalArgumentException("Invalid Provider Type.");
        }
    }
}
