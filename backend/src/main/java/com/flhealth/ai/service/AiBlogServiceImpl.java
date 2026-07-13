package com.flhealth.ai.service;

import com.flhealth.ai.client.OpenAiClient;
import com.flhealth.ai.dto.BlogGenerationRequest;
import com.flhealth.ai.dto.BlogGenerationResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class AiBlogServiceImpl implements AiBlogService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiBlogServiceImpl(OpenAiClient openAiClient) {
        this.openAiClient = openAiClient;
    }

    @Override
    public BlogGenerationResponse generateBlog(BlogGenerationRequest request) {
        try {

            String raw = openAiClient.generateBlog(request);

            JsonNode root = objectMapper.readTree(raw);

            String content = root
                    .path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();

            return objectMapper.readValue(content, BlogGenerationResponse.class);

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate blog", e);
        }
    }
}