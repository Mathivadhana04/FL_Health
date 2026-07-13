// seo/dto/SeoRequest.java
package com.flhealth.seo.dto;

public class SeoRequest {
    private String content;
    private String focusKeyword;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getFocusKeyword() { return focusKeyword; }
    public void setFocusKeyword(String focusKeyword) { this.focusKeyword = focusKeyword; }
}