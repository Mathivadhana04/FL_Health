// seo/dto/SeoResponse.java
package com.flhealth.seo.dto;

public class SeoResponse {
    private Double seoScore;
    private String metaTitle;
    private String metaDescription;
    private String keywordDensity;
    private String suggestedKeywords;

    public Double getSeoScore() { return seoScore; }
    public void setSeoScore(Double seoScore) { this.seoScore = seoScore; }

    public String getMetaTitle() { return metaTitle; }
    public void setMetaTitle(String metaTitle) { this.metaTitle = metaTitle; }

    public String getMetaDescription() { return metaDescription; }
    public void setMetaDescription(String metaDescription) { this.metaDescription = metaDescription; }

    public String getKeywordDensity() { return keywordDensity; }
    public void setKeywordDensity(String keywordDensity) { this.keywordDensity = keywordDensity; }

    public String getSuggestedKeywords() { return suggestedKeywords; }
    public void setSuggestedKeywords(String suggestedKeywords) { this.suggestedKeywords = suggestedKeywords; }
}