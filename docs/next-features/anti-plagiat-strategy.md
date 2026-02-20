# Anti-Plagiat Strategy for Certification Generation

## Overview

This document outlines the strategy for detecting and preventing plagiarism in auto-generated certification decks. The goal is to ensure all generated content is **original** and does not infringe on proprietary exam materials or question banks.

---

## Legal Constraints (Non-Negotiable)

```
❌ FORBIDDEN:
- Reproduction of official exam questions
- Reformulation of published exam dumps
- Direct copying of proprietary content
- Circumventing copyright protections

✔️ ALLOWED:
- Public blueprints (Microsoft Learn, AWS docs, etc.)
- Open-source documentation
- General knowledge synthesis
- Original question generation based on public sources
```

---

## Implementation Strategy

### Level 1: String Matching (Low Effort, Immediate)

**Cost:** Low | **Accuracy:** 80% | **False Positives:** Low

**Implementation:**
```typescript
// Check for exact string matches
const detectExactMatch = (generatedText: string, bannedQuestions: string[]) => {
  for (const banned of bannedQuestions) {
    const similarity = calculateLevenshteinDistance(generatedText, banned);
    if (similarity > 0.85) {
      return { plagiarized: true, bannedQuestion: banned, similarity };
    }
  }
  return { plagiarized: false };
};
```

**Data Source:**
- Curated database of known exam dumps (Brainly, Quizlet, ExamTopics, etc.)
- Periodically updated from public sources
- Stored locally or via external API (OpenAI Moderation)

**Process:**
1. After generation, check each question against banned list
2. If match > 85% similarity → Regenerate or ABORT
3. Log all matches for human review

**Pros:**
- Fast (< 100ms per check)
- No API calls needed
- Easy to implement

**Cons:**
- Misses paraphrases
- Requires curated database maintenance

---

### Level 2: Semantic Similarity (Medium Effort, Recommended)

**Cost:** Medium | **Accuracy:** 90%+ | **False Positives:** Medium

**Implementation:**
```typescript
// Use embeddings to detect semantic plagiarism
const detectSemanticPlagiarism = async (
  generatedQuestions: string[],
  referenceCorpus: Embedding[]
) => {
  const generatedEmbeddings = await getEmbeddings(generatedQuestions);

  for (const gen of generatedEmbeddings) {
    for (const ref of referenceCorpus) {
      const cosineSimilarity = calculateCosineSimilarity(gen, ref);
      if (cosineSimilarity > 0.80) {
        return {
          plagiarized: true,
          similarity: cosineSimilarity,
          referenceQuestion: ref.text,
        };
      }
    }
  }

  return { plagiarized: false };
};
```

**Data Source:**
- Claude embeddings (via Anthropic API)
- Proprietary exam question corpus
- Public knowledge base (Wikipedia, academic papers)

**Process:**
1. Generate questions using Claude API
2. Get embeddings for generated questions
3. Compare against reference corpus embeddings
4. If similarity > 0.80 → Manual review required
5. Flag deck as "Under Review"

**Pros:**
- Catches paraphrases
- Scalable with embeddings API
- Can integrate with existing LLM pipeline

**Cons:**
- Requires API calls ($$ cost)
- Medium latency (1-2 seconds)
- False positives with similar legitimate content

**Cost Estimate:**
- Per 100 questions: ~$0.50 (using Claude embeddings)
- Manageable for MVP

---

### Level 3: Human Review (Async, Scalable)

**Cost:** Human time | **Accuracy:** 99%+ | **Timeline:** 24-72 hours

**Process:**
1. All generated decks flagged as "Pending Review"
2. Random 5-10% sampled for manual review
3. Checklist:
   - [ ] Questions are original (not copied)
   - [ ] Answers are accurate
   - [ ] Distractors are plausible but incorrect
   - [ ] No proprietary content detected
   - [ ] Pedagogically sound

4. If approved → Status = "Approved"
5. If rejected → Regenerate or ABORT

**Workflow:**
```
Generated Deck
    ↓
Auto-checks (Level 1 + Level 2)
    ↓
If Flags Found → Manual Review (3-5 min per deck)
    ↓
Approved / Rejected
```

---

## Recommended Approach for MVP

### Phase 1 (Immediate)
✅ **Implement Level 1 only**
- String matching with 85% threshold
- Curated banned questions database
- Cheap, fast, easy

### Phase 2 (Week 1-2)
✅ **Add Level 2 with sampling**
- Semantic similarity for high-risk questions
- Manual review on ALL initial decks (to build trust)
- Scale human review down after 50+ successful approvals

### Phase 3 (Month 1)
✅ **Full automation**
- Level 1 + Level 2 auto-check
- Human review only on flagged decks
- Auto-approve low-risk decks (< 0.70 similarity)

---

## Fallback Strategy

**If anti-plagiat is too complex:**
1. Skip Level 2 (embeddings)
2. Manual human review on ALL decks (first 100)
3. Implement Level 1 + 3 only
4. Scale automation later

**Timeline:** 1-2 weeks to build trust with first 50 decks

---

## Implementation Checklist

- [ ] Create `CertificationValidator` class
- [ ] Build banned questions database (CSV/JSON)
- [ ] Implement Levenshtein distance checker
- [ ] Add manual review workflow (dashboard section)
- [ ] Create webhook for async validation
- [ ] Add flagging mechanism to Deck model
- [ ] Build reviewer dashboard
- [ ] Log all checks for audit trail

---

## Monitoring & Audit Trail

```typescript
// Log every validation check
model PlagiarismCheck {
  id          String   @id @default(cuid())
  deckId      String
  level       Int      // 1, 2, or 3
  result      String   // "passed", "flagged", "rejected"
  score       Float    // 0.0 - 1.0
  details     Json     // { matches: [], suggestions: [] }
  reviewedBy  String?  // Admin who reviewed (Level 3)
  createdAt   DateTime @default(now())

  deck Deck @relation(fields: [deckId], references: [id], onDelete: Cascade)
}
```

---

## References

- [DMCA Section 1201](https://en.wikipedia.org/wiki/Anti-circumvention_rules) - Copyright protection
- [Fair Use Doctrine](https://en.wikipedia.org/wiki/Fair_use) - Educational use
- [Plagiarism Detection Tools](https://www.turnitin.com/) - Industry standard
- [Semantic Search with Embeddings](https://platform.openai.com/docs/guides/embeddings) - Implementation guide

---

## Questions & Escalation

**Question:** What if generated content passes Level 1 & 2 but is still plagiarized?
**Answer:** Human reviewer catches it in Level 3. Flag for improvement.

**Question:** Can we use OpenAI's moderation API instead?
**Answer:** OpenAI API is for content policy (hate speech, violence). Not designed for plagiarism detection. Use Turnitin/custom solution.

**Question:** What's the liability if plagiarism slips through?
**Answer:**
1. Disclaimer: "Non-affiliated with certification body"
2. Terms: "User assumes risk"
3. Human review adds defensibility
4. Rapid DMCA takedown if reported

---

## Decision Matrix

| Approach | Cost | Effort | Accuracy | Timeline | Risk |
|----------|------|--------|----------|----------|------|
| Level 1 only | Low | 1 day | 80% | Immediate | Medium |
| Level 1 + Manual | Low+Human | 2 days | 99% | Immediate | Low |
| Level 1 + 2 | Medium | 3 days | 90% | Immediate | Low |
| All 3 levels | High | 1 week | 99%+ | Week 1 | Very Low |
| **RECOMMENDATION** | **Low+Human** | **2 days** | **99%** | **Immediate** | **Low** |

---

**Next Step:** Implement Level 1 + Manual Review. Build Level 2 async after MVP launch.
