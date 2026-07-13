package com.flhealth.auth.service;

import com.flhealth.auth.dto.AuthResponse;
import com.flhealth.auth.dto.LoginRequest;
import com.flhealth.auth.dto.RegisterRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
}
