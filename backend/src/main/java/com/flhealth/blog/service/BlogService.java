package com.flhealth.blog.service;

import com.flhealth.blog.dto.BlogRequest;
import com.flhealth.blog.dto.BlogResponse;
import java.util.List;

public interface BlogService {

    BlogResponse create(BlogRequest request);

    BlogResponse update(Long id, BlogRequest request);

    BlogResponse getById(Long id);

    List<BlogResponse> getAll();

    List<BlogResponse> getByWorkspace(Long workspace);

    void delete(Long id);
}