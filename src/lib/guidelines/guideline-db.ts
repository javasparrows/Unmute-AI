export interface GuidelineItem {
  id: string;
  section: string;
  requirement: string;
  applicableSections: string[];
  keywords: string[];
  priority: "required" | "recommended";
}

export interface Guideline {
  id: string;
  name: string;
  fullName: string;
  applicableDesigns: string[];
  version: string;
  items: GuidelineItem[];
}

export const GUIDELINES: Record<string, Guideline> = {
  "CONSORT-AI": {
    id: "CONSORT-AI",
    name: "CONSORT-AI",
    fullName:
      "Consolidated Standards of Reporting Trials - Artificial Intelligence",
    applicableDesigns: ["RCT with AI intervention"],
    version: "2020",
    items: [
      {
        id: "CONSORT-AI-1a",
        section: "Title/Abstract",
        requirement:
          "Indicate that the intervention involves AI/ML in the title",
        applicableSections: ["ABSTRACT"],
        keywords: [
          "AI",
          "artificial intelligence",
          "machine learning",
          "deep learning",
        ],
        priority: "required",
      },
      {
        id: "CONSORT-AI-1b",
        section: "Abstract",
        requirement:
          "Include AI-specific information in structured abstract: input data, output, intended use",
        applicableSections: ["ABSTRACT"],
        keywords: ["input", "output", "model", "prediction"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-4a",
        section: "Methods",
        requirement:
          "Describe the AI intervention: input data, model architecture, training data source, output specification",
        applicableSections: ["METHODS"],
        keywords: ["architecture", "training data", "input", "output", "model"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-4b",
        section: "Methods",
        requirement:
          "Describe how AI was integrated into clinical workflow and human-AI interaction",
        applicableSections: ["METHODS"],
        keywords: ["workflow", "integration", "human", "interaction", "decision"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-5",
        section: "Methods",
        requirement:
          "Report AI model version used, including software version and updates during trial",
        applicableSections: ["METHODS"],
        keywords: ["version", "software", "update"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-14a",
        section: "Results",
        requirement:
          "Report AI system performance metrics (sensitivity, specificity, AUROC) on trial data",
        applicableSections: ["RESULTS"],
        keywords: [
          "sensitivity",
          "specificity",
          "AUROC",
          "AUC",
          "accuracy",
          "performance",
          "F1",
        ],
        priority: "required",
      },
      {
        id: "CONSORT-AI-19",
        section: "Discussion",
        requirement:
          "Discuss AI-specific limitations: potential biases in training data and generalizability concerns",
        applicableSections: ["DISCUSSION"],
        keywords: [
          "bias",
          "generalizability",
          "limitation",
          "external validation",
        ],
        priority: "required",
      },
    ],
  },

  "TRIPOD-AI": {
    id: "TRIPOD-AI",
    name: "TRIPOD+AI",
    fullName:
      "Transparent Reporting of Multivariable Prediction Model - AI",
    applicableDesigns: [
      "Prediction model development",
      "Prediction model validation",
    ],
    version: "2024",
    items: [
      {
        id: "TRIPOD-AI-1",
        section: "Title",
        requirement:
          "Identify study as developing/validating/updating a prediction model using AI",
        applicableSections: ["ABSTRACT"],
        keywords: ["prediction", "model", "development", "validation", "AI"],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-5a",
        section: "Methods",
        requirement:
          "Describe data sources: how training and test data were obtained, selection criteria",
        applicableSections: ["METHODS"],
        keywords: ["data source", "training", "test", "split", "cohort"],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-7",
        section: "Methods",
        requirement:
          "Describe model architecture, hyperparameters, and training procedure for replication",
        applicableSections: ["METHODS"],
        keywords: [
          "architecture",
          "hyperparameter",
          "training",
          "optimization",
          "learning rate",
          "epoch",
        ],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-10",
        section: "Methods",
        requirement:
          "Specify how model performance was evaluated: metrics, calibration, and validation strategy",
        applicableSections: ["METHODS"],
        keywords: [
          "evaluation",
          "metric",
          "calibration",
          "cross-validation",
          "bootstrap",
        ],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-13",
        section: "Results",
        requirement:
          "Report model performance with confidence intervals",
        applicableSections: ["RESULTS"],
        keywords: [
          "confidence interval",
          "CI",
          "performance",
          "AUC",
          "calibration",
        ],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-16",
        section: "Discussion",
        requirement:
          "Discuss clinical applicability and deployment considerations",
        applicableSections: ["DISCUSSION"],
        keywords: [
          "clinical",
          "applicability",
          "deployment",
          "implementation",
        ],
        priority: "required",
      },
    ],
  },

  CLAIM: {
    id: "CLAIM",
    name: "CLAIM",
    fullName: "Checklist for AI in Medical Imaging",
    applicableDesigns: ["Medical imaging AI study"],
    version: "2020",
    items: [
      {
        id: "CLAIM-1",
        section: "Title/Abstract",
        requirement:
          "State the imaging modality and body region studied",
        applicableSections: ["ABSTRACT"],
        keywords: [
          "CT",
          "MRI",
          "X-ray",
          "ultrasound",
          "imaging",
          "modality",
        ],
        priority: "required",
      },
      {
        id: "CLAIM-10",
        section: "Methods",
        requirement:
          "Report dataset demographics, imaging parameters, and exclusion criteria",
        applicableSections: ["METHODS"],
        keywords: [
          "demographics",
          "age",
          "sex",
          "exclusion",
          "inclusion",
        ],
        priority: "required",
      },
      {
        id: "CLAIM-15",
        section: "Methods",
        requirement:
          "Describe data augmentation and preprocessing steps",
        applicableSections: ["METHODS"],
        keywords: [
          "augmentation",
          "preprocessing",
          "normalization",
          "resize",
        ],
        priority: "required",
      },
      {
        id: "CLAIM-20",
        section: "Methods",
        requirement:
          "Describe training/validation/test data split strategy",
        applicableSections: ["METHODS"],
        keywords: ["split", "training", "validation", "test", "fold"],
        priority: "required",
      },
      {
        id: "CLAIM-25",
        section: "Results",
        requirement:
          "Report performance on test set with subgroup analysis",
        applicableSections: ["RESULTS"],
        keywords: ["subgroup", "performance", "test set", "external"],
        priority: "required",
      },
      {
        id: "CLAIM-30",
        section: "Discussion",
        requirement:
          "Discuss failure cases and model limitations",
        applicableSections: ["DISCUSSION"],
        keywords: [
          "failure",
          "limitation",
          "error",
          "misclassification",
        ],
        priority: "required",
      },
    ],
  },

  "STARD-AI": {
    id: "STARD-AI",
    name: "STARD-AI",
    fullName:
      "Standards for Reporting Diagnostic Accuracy Studies - AI",
    applicableDesigns: ["Diagnostic accuracy study with AI"],
    version: "2021",
    items: [
      {
        id: "STARD-AI-1",
        section: "Title/Abstract",
        requirement:
          "Identify study as evaluating diagnostic accuracy of an AI system",
        applicableSections: ["ABSTRACT"],
        keywords: [
          "diagnostic",
          "accuracy",
          "AI",
          "sensitivity",
          "specificity",
        ],
        priority: "required",
      },
      {
        id: "STARD-AI-5",
        section: "Methods",
        requirement:
          "Describe index test (AI system) and reference standard clearly",
        applicableSections: ["METHODS"],
        keywords: [
          "reference standard",
          "gold standard",
          "ground truth",
          "index test",
        ],
        priority: "required",
      },
      {
        id: "STARD-AI-10",
        section: "Methods",
        requirement:
          "Report how AI outputs were compared to reference standard",
        applicableSections: ["METHODS"],
        keywords: [
          "comparison",
          "threshold",
          "cutoff",
          "operating point",
        ],
        priority: "required",
      },
      {
        id: "STARD-AI-15",
        section: "Results",
        requirement:
          "Report sensitivity, specificity, and predictive values with confidence intervals",
        applicableSections: ["RESULTS"],
        keywords: [
          "sensitivity",
          "specificity",
          "PPV",
          "NPV",
          "confidence interval",
        ],
        priority: "required",
      },
    ],
  },

  GAMER: {
    id: "GAMER",
    name: "GAMER",
    fullName: "Guidelines for Generative AI in Medical Research",
    applicableDesigns: ["Any study using generative AI as a tool"],
    version: "2024",
    items: [
      {
        id: "GAMER-1",
        section: "Methods",
        requirement:
          "Disclose which generative AI tools were used: model name, version, provider",
        applicableSections: ["METHODS"],
        keywords: [
          "GPT",
          "Gemini",
          "Claude",
          "LLM",
          "generative AI",
          "ChatGPT",
        ],
        priority: "required",
      },
      {
        id: "GAMER-2",
        section: "Methods",
        requirement:
          "Describe the specific tasks AI was used for (translation, analysis, writing assistance, etc.)",
        applicableSections: ["METHODS"],
        keywords: [
          "translation",
          "analysis",
          "writing",
          "editing",
          "screening",
        ],
        priority: "required",
      },
      {
        id: "GAMER-3",
        section: "Methods",
        requirement:
          "Describe prompt engineering techniques used (if applicable)",
        applicableSections: ["METHODS"],
        keywords: [
          "prompt",
          "instruction",
          "few-shot",
          "chain-of-thought",
        ],
        priority: "recommended",
      },
      {
        id: "GAMER-4",
        section: "Methods",
        requirement:
          "Describe fact-checking and verification procedures for AI-generated content",
        applicableSections: ["METHODS"],
        keywords: [
          "verification",
          "fact-check",
          "validation",
          "human review",
        ],
        priority: "required",
      },
      {
        id: "GAMER-5",
        section: "Methods",
        requirement:
          "Address data privacy concerns when using AI tools with patient data",
        applicableSections: ["METHODS"],
        keywords: [
          "privacy",
          "de-identified",
          "anonymized",
          "HIPAA",
          "consent",
        ],
        priority: "required",
      },
      {
        id: "GAMER-6",
        section: "Acknowledgments",
        requirement:
          "Include AI disclosure statement in acknowledgments or methods",
        applicableSections: ["OTHER"],
        keywords: [
          "acknowledge",
          "declare",
          "disclosure",
          "AI assistance",
        ],
        priority: "required",
      },
    ],
  },
};

export function getGuideline(id: string): Guideline | undefined {
  return GUIDELINES[id];
}

export function getAllGuidelines(): Guideline[] {
  return Object.values(GUIDELINES);
}

export function getGuidelineForDesign(designType: string): Guideline[] {
  return Object.values(GUIDELINES).filter((g) =>
    g.applicableDesigns.some((d) =>
      d.toLowerCase().includes(designType.toLowerCase()),
    ),
  );
}
