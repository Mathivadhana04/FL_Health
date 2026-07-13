package com.flhealth.blog.controller;

import com.flhealth.blog.dto.BlogRequest;
import com.flhealth.blog.dto.BlogResponse;
import com.flhealth.blog.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blogs")
@RequiredArgsConstructor
@CrossOrigin
public class BlogController {

    private final BlogService blogService;

    @PostMapping
    public BlogResponse create(@RequestBody BlogRequest request) {
        return blogService.create(request);
    }

    @PutMapping("/{id}")
    public BlogResponse update(@PathVariable Long id, @RequestBody BlogRequest request) {
        return blogService.update(id, request);
    }

    @GetMapping("/{id}")
    public BlogResponse getById(@PathVariable Long id) {
        return blogService.getById(id);
    }

    @GetMapping
    public List<BlogResponse> getAll() {
        return blogService.getAll();
    }

    @GetMapping("/workspace/{workspace}")
    public List<BlogResponse> getByWorkspace(@PathVariable Long workspace) {
        return blogService.getByWorkspace(workspace);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        blogService.delete(id);
    }
}