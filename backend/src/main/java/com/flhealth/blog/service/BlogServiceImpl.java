package com.flhealth.blog.service;

import com.flhealth.blog.dto.BlogRequest;
import com.flhealth.blog.dto.BlogResponse;
import com.flhealth.blog.entity.Blog;
import com.flhealth.blog.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private final BlogRepository blogRepository;

    @Override
    public BlogResponse create(BlogRequest request) {
        Blog blog = Blog.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .status(request.getStatus())
                .workspace(request.getWorkspace())
                .author(request.getAuthor())
                .build();

        return map(blogRepository.save(blog));
    }

    @Override
    public BlogResponse update(Long id, BlogRequest request) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Blog not found"));

        blog.setTitle(request.getTitle());
        blog.setContent(request.getContent());
        blog.setStatus(request.getStatus());
        blog.setWorkspace(request.getWorkspace());
        blog.setAuthor(request.getAuthor());

        return map(blogRepository.save(blog));
    }

    @Override
    public BlogResponse getById(Long id) {
        return blogRepository.findById(id).map(this::map)
                .orElseThrow(() -> new RuntimeException("Blog not found"));
    }

    @Override
    public List<BlogResponse> getAll() {
        return blogRepository.findAll().stream().map(this::map).collect(Collectors.toList());
    }

    @Override
    public List<BlogResponse> getByWorkspace(Long workspace) {
        return blogRepository.findByWorkspace(workspace)
                .stream().map(this::map).collect(Collectors.toList());
    }

    @Override
    public void delete(Long id) {
        blogRepository.deleteById(id);
    }

    private BlogResponse map(Blog blog) {
        return BlogResponse.builder()
                .id(blog.getId())
                .title(blog.getTitle())
                .content(blog.getContent())
                .status(blog.getStatus())
                .workspace(blog.getWorkspace())
                .author(blog.getAuthor())
                .createdAt(blog.getCreatedAt())
                .updatedAt(blog.getUpdatedAt())
                .build();
    }
}