package com.flhealth.ai.service;

import com.flhealth.ai.dto.BlogGenerationRequest;
import com.flhealth.ai.dto.BlogGenerationResponse;

public interface AiBlogService {
    BlogGenerationResponse generateBlog(BlogGenerationRequest request);
}