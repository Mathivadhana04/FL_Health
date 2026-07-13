package com.flhealth.blog.dto;

import com.flhealth.blog.enums.BlogStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BlogRequest {
    private String title;
    private String content;
    private BlogStatus status;
    private Long workspace;
    private Long author;
}