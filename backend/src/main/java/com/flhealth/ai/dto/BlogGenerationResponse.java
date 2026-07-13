package com.flhealth.ai.dto;

import java.util.List;

public class BlogGenerationResponse {

    private String title;
    private String introduction;
    private String mainContent;
    private String conclusion;
    private List<String> faq;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getIntroduction() {
        return introduction;
    }

    public void setIntroduction(String introduction) {
        this.introduction = introduction;
    }

    public String getMainContent() {
        return mainContent;
    }

    public void setMainContent(String mainContent) {
        this.mainContent = mainContent;
    }

    public String getConclusion() {
        return conclusion;
    }

    public void setConclusion(String conclusion) {
        this.conclusion = conclusion;
    }

    public List<String> getFaq() {
        return faq;
    }

    public void setFaq(List<String> faq) {
        this.faq = faq;
    }
}