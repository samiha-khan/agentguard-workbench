package dev.samihakh.agentguard.eval;

import dev.samihakh.agentguard.eval.EvaluationModels.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {
    private final EvaluationService service;

    public EvaluationController(EvaluationService service) { this.service = service; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public EvaluationResponse evaluate(@Valid @RequestBody EvaluationRequest request) {
        return service.evaluate(request);
    }

    @GetMapping
    public List<RunSummary> history() { return service.history(); }

    @GetMapping("/{id}")
    public EvaluationResponse get(@PathVariable Long id) { return service.get(id); }

    @ExceptionHandler(RunNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(RunNotFoundException exception) {
        return Map.of("error", exception.getMessage());
    }
}

