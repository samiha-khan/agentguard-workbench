package dev.samihakh.agentguard.run;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class AgentRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 200)
    private String taskTitle;
    @Column(nullable = false, length = 4000)
    private String acceptanceCriteria;
    @Column(nullable = false, length = 20000)
    private String diffText;
    @Column(nullable = false)
    private int score;
    @Column(nullable = false)
    private String verdict;
    @Column(nullable = false, length = 4000)
    private String findingsJson;
    @Column(nullable = false)
    private Instant createdAt;

    protected AgentRun() {}

    public AgentRun(String taskTitle, String acceptanceCriteria, String diffText,
                    int score, String verdict, String findingsJson) {
        this.taskTitle = taskTitle;
        this.acceptanceCriteria = acceptanceCriteria;
        this.diffText = diffText;
        this.score = score;
        this.verdict = verdict;
        this.findingsJson = findingsJson;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getTaskTitle() { return taskTitle; }
    public String getAcceptanceCriteria() { return acceptanceCriteria; }
    public String getDiffText() { return diffText; }
    public int getScore() { return score; }
    public String getVerdict() { return verdict; }
    public String getFindingsJson() { return findingsJson; }
    public Instant getCreatedAt() { return createdAt; }
}

