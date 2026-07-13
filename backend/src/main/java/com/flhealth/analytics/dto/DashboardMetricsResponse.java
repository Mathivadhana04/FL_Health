// analytics/dto/DashboardMetricsResponse.java
package com.flhealth.analytics.dto;

public class DashboardMetricsResponse {
    private Long totalBlogs;
    private Long publishedBlogs;
    private Long draftBlogs;
    private Long aiRequests;
    private Long seoReports;

    public Long getTotalBlogs() { return totalBlogs; }
    public void setTotalBlogs(Long totalBlogs) { this.totalBlogs = totalBlogs; }

    public Long getPublishedBlogs() { return publishedBlogs; }
    public void setPublishedBlogs(Long publishedBlogs) { this.publishedBlogs = publishedBlogs; }

    public Long getDraftBlogs() { return draftBlogs; }
    public void setDraftBlogs(Long draftBlogs) { this.draftBlogs = draftBlogs; }

    public Long getAiRequests() { return aiRequests; }
    public void setAiRequests(Long aiRequests) { this.aiRequests = aiRequests; }

    public Long getSeoReports() { return seoReports; }
    public void setSeoReports(Long seoReports) { this.seoReports = seoReports; }
}