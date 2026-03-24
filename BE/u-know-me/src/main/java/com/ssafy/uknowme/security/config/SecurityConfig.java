package com.ssafy.uknowme.security.config;

import com.ssafy.uknowme.security.filter.TokenAuthenticationFilter;
import com.ssafy.uknowme.security.filter.TokenAuthorizationFilter;
import com.ssafy.uknowme.security.properties.AppProperties;
import com.ssafy.uknowme.security.token.AuthTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableGlobalMethodSecurity(securedEnabled = true)
public class SecurityConfig {

    private final AuthTokenProvider authTokenProvider;

    private final AppProperties appProperties;

    private final AuthenticationManagerBuilder authenticationManagerBuilder;

    private final String[] PERMIT_ALL_SWAGGER = {
            /* swagger v2 */
            "/v2/api-docs",
            "/swagger-resources",
            "/swagger-resources/**",
            "/configuration/ui",
            "/configuration/security",
            "/swagger-ui.html",
            "/webjars/**",
            /* swagger v3 */
            "/v3/api-docs/**",
            "/swagger-ui/**"
    };
    private final String[] PERMIT_ALL_MEMBER = {
            "/member/login",
            "/member/join",
            "/member/check/**",
    };

    private final String[] PERMIT_ALL_WEBSOCKET = {
            "/ws/**"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        AuthenticationManager authenticationManager = authenticationManagerBuilder.getObject();

        TokenAuthenticationFilter tokenAuthenticationFilter = new TokenAuthenticationFilter(authTokenProvider, appProperties, authenticationManager);
        tokenAuthenticationFilter.setFilterProcessesUrl("/member/login");

        return http
                    .cors().configurationSource(corsConfigurationSource())
                .and()
                    .csrf().disable()
                    .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                    .formLogin().disable()
                    .httpBasic().disable()
                    .addFilter(tokenAuthenticationFilter)
                    .addFilterBefore(tokenAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class)
                    .authorizeRequests()
                    .antMatchers(PERMIT_ALL_SWAGGER).permitAll()
                    .antMatchers(PERMIT_ALL_MEMBER).permitAll()
                    .antMatchers(PERMIT_ALL_WEBSOCKET).permitAll()
                    .anyRequest().authenticated()
                .and()
                    .exceptionHandling()
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                .and().build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public TokenAuthorizationFilter tokenAuthorizationFilter() {
        return new TokenAuthorizationFilter(authTokenProvider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("HEAD","POST","GET","DELETE","PUT"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.addExposedHeader("Authorization");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
