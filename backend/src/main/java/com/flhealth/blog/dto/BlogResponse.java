package com.flhealth.blog.dto;

import com.flhealth.blog.enums.BlogStatus;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogResponse {
    private Long id;
    private String title;
    private String content;
    private BlogStatus status;
    private Long workspace;
    private Long author;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}