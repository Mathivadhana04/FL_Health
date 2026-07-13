// seo/service/SeoServiceImpl.java
package com.flhealth.seo.service;

import org.springframework.stereotype.Service;
import com.flhealth.seo.dto.SeoRequest;
import com.flhealth.seo.dto.SeoResponse;
import com.flhealth.seo.entity.SeoReport;
import com.flhealth.seo.repository.SeoReportRepository;

import java.util.*;

@Service
public class SeoServiceImpl implements SeoService {

    private final SeoReportRepository repository;

    public SeoServiceImpl(SeoReportRepository repository) {
        this.repository = repository;
    }

    @Override
    public SeoResponse analyzeSeo(SeoRequest request) {

        String content = request.getContent().toLowerCase();
        String keyword = request.getFocusKeyword() == null ? "" : request.getFocusKeyword().toLowerCase();

        int wordCount = content.split("\\s+").length;
        int keywordCount = keyword.isEmpty() ? 0 : content.split(keyword, -1).length - 1;

        double density = wordCount == 0 ? 0 : ((double) keywordCount / wordCount) * 100;

        double score = Math.min(100,
                (wordCount > 300 ? 30 : 10) +
                (density > 1 && density < 3 ? 40 : 20) +
                (content.contains("https") ? 10 : 0) +
                (content.length() > 1000 ? 20 : 10)
        );

        String metaTitle = generateTitle(content);
        String metaDescription = generateDescription(content);

        String suggestions = "add long-tail keywords, improve readability, optimize headings, add internal links";

        Map<String, Double> densityMap = new HashMap<>();
        densityMap.put(keyword, density);

        SeoReport report = new SeoReport();
        report.setContent(request.getContent());
        report.setMetaTitle(metaTitle);
        report.setMetaDescription(metaDescription);
        report.setSeoScore(score);
        report.setSuggestedKeywords(suggestions);
        report.setKeywordDensity(densityMap.toString());

        repository.save(report);

        SeoResponse response = new SeoResponse();
        response.setSeoScore(score);
        response.setMetaTitle(metaTitle);
        response.setMetaDescription(metaDescription);
        response.setKeywordDensity(densityMap.toString());
        response.setSuggestedKeywords(suggestions);

        return response;
    }

    private String generateTitle(String content) {
        return content.length() > 60 ? content.substring(0, 60) + "..." : content;
    }

    private String generateDescription(String content) {
        return content.length() > 155 ? content.substring(0, 155) + "..." : content;
    }
}