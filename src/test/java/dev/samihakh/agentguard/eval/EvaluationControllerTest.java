package dev.samihakh.agentguard.eval;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class EvaluationControllerTest {
    private static final String TESTED_DIFF =
        "--- a/ProgressCard.tsx\\n+++ b/ProgressCard.tsx\\n+export function ProgressCard() {}\\n"
        + "--- a/ProgressCard.test.tsx\\n+++ b/ProgressCard.test.tsx\\n+test('empty state', () => {})";

    @Autowired MockMvc mockMvc;

    private ResultActions submit(String title, String criteria, String diff, boolean testsPassed) throws Exception {
        String body = """
            {"taskTitle":"%s","acceptanceCriteria":"%s","diffText":"%s","testsPassed":%s}
            """.formatted(title, criteria, diff, testsPassed);
        return mockMvc.perform(post("/api/evaluations").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void passesACleanTestedChange() throws Exception {
        submit("Add learner progress card", "Render progress", TESTED_DIFF, true)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.verdict").value("PASS"))
            .andExpect(jsonPath("$.score").value(100));
    }

    @Test
    void asksForReviewWhenOnlyWarningsRemain() throws Exception {
        submit("Rename helper", "Keep behavior", "--- a/Util.java\\n+++ b/Util.java\\n+int x = 1;", true)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.verdict").value("REVIEW"))
            .andExpect(jsonPath("$.score").value(90));
    }

    @Test
    void blocksWhenTestsFail() throws Exception {
        submit("Add learner progress card", "Render progress", TESTED_DIFF, false)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.verdict").value("BLOCKED"))
            .andExpect(jsonPath("$.score").value(60));
    }

    @Test
    void savedRunCanBeReadBackAndAppearsInHistory() throws Exception {
        String created = submit("Persisted run", "Check storage", TESTED_DIFF, true)
            .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/evaluations/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.verdict").value("PASS"))
            .andExpect(jsonPath("$.findings[0].rule").exists());

        mockMvc.perform(get("/api/evaluations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].id", hasItem(id)))
            .andExpect(jsonPath("$[?(@.id == " + id + ")].taskTitle").value("Persisted run"));
    }

    @Test
    void returnsNotFoundForAnUnknownRun() throws Exception {
        mockMvc.perform(get("/api/evaluations/999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void rejectsBlankFields() throws Exception {
        submit("", "Render progress", TESTED_DIFF, true).andExpect(status().isBadRequest());
        submit("Title", "", TESTED_DIFF, true).andExpect(status().isBadRequest());
        submit("Title", "Render progress", "", true).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsADiffOverTheSizeLimit() throws Exception {
        submit("Title", "Render progress", "+".repeat(20001), true).andExpect(status().isBadRequest());
    }
}
