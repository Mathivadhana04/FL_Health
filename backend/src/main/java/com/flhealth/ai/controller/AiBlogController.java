package com.flhealth.ai.controller;

import com.flhealth.ai.dto.BlogGenerationRequest;
import com.flhealth.ai.dto.BlogGenerationResponse;
import com.flhealth.ai.service.AiBlogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/blog")
@CrossOrigin
public class AiBlogController {

    private final AiBlogService aiBlogService;

    public AiBlogController(AiBlogService aiBlogService) {
        this.aiBlogService = aiBlogService;
    }

    @PostMapping("/generate")
    public ResponseEntity<BlogGenerationResponse> generate(@RequestBody BlogGenerationRequest request) {
        return ResponseEntity.ok(aiBlogService.generateBlog(request));
    }
}