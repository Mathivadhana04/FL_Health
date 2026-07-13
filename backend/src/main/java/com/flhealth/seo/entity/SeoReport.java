// seo/entity/SeoReport.java
package com.flhealth.seo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "seo_reports")
public class SeoReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    private String metaTitle;
    private String metaDescription;

    private Double seoScore;

    private String suggestedKeywords;

    @Column(columnDefinition = "TEXT")
    private String keywordDensity;

    private LocalDateTime createdAt;

    public SeoReport() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMetaTitle() { return metaTitle; }
    public void setMetaTitle(String metaTitle) { this.metaTitle = metaTitle; }

    public String getMetaDescription() { return metaDescription; }
    public void setMetaDescription(String metaDescription) { this.metaDescription = metaDescription; }

    public Double getSeoScore() { return seoScore; }
    public void setSeoScore(Double seoScore) { this.seoScore = seoScore; }

    public String getSuggestedKeywords() { return suggestedKeywords; }
    public void setSuggestedKeywords(String suggestedKeywords) { this.suggestedKeywords = suggestedKeywords; }

    public String getKeywordDensity() { return keywordDensity; }
    public void setKeywordDensity(String keywordDensity) { this.keywordDensity = keywordDensity; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}