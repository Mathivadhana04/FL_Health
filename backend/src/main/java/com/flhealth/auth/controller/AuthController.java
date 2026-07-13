package com.flhealth.auth.controller;

import com.flhealth.auth.dto.AuthResponse;
import com.flhealth.auth.dto.LoginRequest;
import com.flhealth.auth.dto.RegisterRequest;
import com.flhealth.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    @GetMapping("/xyz123")
public String xyz123() {
    return "XYZ123";
}
@PostMapping("/echo")
public String echo(@RequestBody(required = false) String body) {
    return body == null ? "BODY_IS_NULL" : body;
}
}




