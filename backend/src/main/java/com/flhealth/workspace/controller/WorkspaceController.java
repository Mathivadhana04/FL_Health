package com.flhealth.workspace.controller;

import com.flhealth.workspace.dto.WorkspaceRequest;
import com.flhealth.workspace.dto.WorkspaceResponse;
import com.flhealth.workspace.service.WorkspaceService;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    private Long getUserId(Authentication auth) {
        return Long.parseLong(auth.getName());
    }

    @PostMapping
    public WorkspaceResponse create(Authentication auth, @RequestBody WorkspaceRequest request) {
        return workspaceService.createWorkspace(getUserId(auth), request);
    }

    @PutMapping("/{id}")
    public WorkspaceResponse update(Authentication auth,
                                    @PathVariable Long id,
                                    @RequestBody WorkspaceRequest request) {
        return workspaceService.updateWorkspace(getUserId(auth), id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication auth, @PathVariable Long id) {
        workspaceService.deleteWorkspace(getUserId(auth), id);
    }

    @GetMapping
    public List<WorkspaceResponse> list(Authentication auth) {
        return workspaceService.getUserWorkspaces(getUserId(auth));
    }
}