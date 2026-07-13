package com.flhealth.ai.client;

import com.flhealth.ai.dto.BlogGenerationRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
public class OpenAiClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey = System.getenv("OPENAI_API_KEY");

    private static final String URL =
            "https://api.openai.com/v1/chat/completions";

    public String generateBlog(BlogGenerationRequest request) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", buildPrompt(request));

        Map<String, Object> body = new HashMap<>();
        body.put("model", "gpt-4o-mini");
        body.put("temperature", 0.7);
        body.put("messages", List.of(message));

        HttpEntity<Map<String, Object>> entity =
                new HttpEntity<>(body, headers);

        ResponseEntity<String> response =
                restTemplate.postForEntity(URL, entity, String.class);

        return response.getBody();
    }

    private String buildPrompt(BlogGenerationRequest r) {
        return """
        Generate a blog in JSON format:

        {
          "title": "",
          "introduction": "",
          "mainContent": "",
          "conclusion": "",
          "faq": []
        }

        Topic: %s
        Audience: %s
        Tone: %s
        WordCount: %d
        Keywords: %s
        """.formatted(
                r.getTopic(),
                r.getAudience(),
                r.getTone(),
                r.getWordCount(),
                String.join(",", r.getKeywords())
        );
    }
}