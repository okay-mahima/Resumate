import { useState } from "react";
import "./App.css";

const API_URL = "https://resumate-9elk.onrender.com";

function App() {
  const [file, setFile] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("About");

  // =========================
  // JOB DESCRIPTION
  // =========================

  const [jobDescription, setJobDescription] = useState("");
  const [jdLoading, setJdLoading] = useState(false);
  const [jdResult, setJdResult] = useState(null);

  // =========================
  // CHAT
  // =========================

  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // =====================================================
  // ANALYZE RESUME
  // =====================================================

  const analyzeResume = async () => {
    if (!file) {
      alert("Please upload a PDF resume.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setResume(data.resume);

      // New resume means new JD result
      setJdResult(null);
      setJobDescription("");

      // New resume means new chat
      setChatHistory([]);

      setActiveTab("About");
    } catch (error) {
      console.error(error);
      alert("Backend is not connected.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // JOB DESCRIPTION MATCH
  // =====================================================

  const analyzeJD = async () => {
    if (!resume) {
      alert("Please upload and analyze a resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter a job description.");
      return;
    }

    setJdLoading(true);
    setJdResult(null);

    try {
      const response = await fetch(`${API_URL}/jd-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setJdResult(data.match);
    } catch (error) {
      console.error(error);
      alert("JD matching ke time backend se connection nahi ho raha.");
    } finally {
      setJdLoading(false);
    }
  };

  // =====================================================
  // CHAT WITH AI
  // =====================================================

  const askAI = async () => {
    const currentQuestion = question.trim();

    if (!currentQuestion) {
      return;
    }

    if (!resume) {
      alert("Please upload and analyze a resume first.");
      return;
    }

    setQuestion("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setChatHistory((prev) => [
          ...prev,
          {
            question: currentQuestion,
            answer: data.error,
          },
        ]);

        return;
      }

      // Backend history available
      if (data.history) {
        setChatHistory(data.history);
      } else {
        // Fallback if backend only sends answer
        setChatHistory((prev) => [
          ...prev,
          {
            question: currentQuestion,
            answer: data.answer || "No answer received.",
          },
        ]);
      }
    } catch (error) {
      console.error(error);

      setChatHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: "Backend is not connected.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // =====================================================
  // JD MATCH CONTENT
  // =====================================================

  const renderJDMatch = () => {
    return (
      <div className="content-card jd-card">
        <div className="section-heading">
          <h2>Job Description Match</h2>

         
        </div>

        <textarea
          className="jd-textarea"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <button
          className="primary-btn"
          onClick={analyzeJD}
          disabled={jdLoading}
        >
          {jdLoading ? "Analyzing Match..." : "Analyze Match"}
        </button>

        {jdResult && (
          <div className="jd-result">

            {/* MATCH SCORE */}

            <div className="jd-score-card">
              <span>Match Score</span>

              <strong>
                {jdResult.match_score ?? 0}%
              </strong>

              <p>
                {jdResult.match_level || "Resume Match"}
              </p>
            </div>

            {/* SUMMARY */}

            {jdResult.summary && (
              <div className="jd-section">
                <h3>Summary</h3>
                <p>{jdResult.summary}</p>
              </div>
            )}

            {/* MATCHED SKILLS */}

            <div className="jd-section">
              <h3>Matched Skills</h3>

              {jdResult.matched_skills?.length > 0 ? (
                <div className="chips">
                  {jdResult.matched_skills.map((skill, index) => (
                    <span key={index}>{skill}</span>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No matching skills found.
                </p>
              )}
            </div>

            {/* MISSING SKILLS */}

            <div className="jd-section">
              <h3>Missing Skills</h3>

              {jdResult.missing_skills?.length > 0 ? (
                <div className="chips">
                  {jdResult.missing_skills.map((skill, index) => (
                    <span key={index}>{skill}</span>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No major missing skills found.
                </p>
              )}
            </div>

            {/* MATCHING EXPERIENCE */}

            {jdResult.matching_experience?.length > 0 && (
              <div className="jd-section">
                <h3>Matching Experience</h3>

                {jdResult.matching_experience.map((item, index) => (
                  <div className="detail-item" key={index}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {/* MATCHING PROJECTS */}

            {jdResult.matching_projects?.length > 0 && (
              <div className="jd-section">
                <h3>Matching Projects</h3>

                {jdResult.matching_projects.map((item, index) => (
                  <div className="detail-item" key={index}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {/* SUGGESTIONS */}

            {jdResult.recommendations?.length > 0 && (
              <div className="jd-section">
                <h3>Suggestions</h3>

                <ul>
                  {jdResult.recommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // MAIN CONTENT
  // =====================================================

  const renderContent = () => {
    if (!resume) {
      return (
        <div className="empty-state">
          <h2>Upload your resume to begin</h2>

          <p>
            Get AI-powered insights about your skills,
            experience and education.
          </p>
        </div>
      );
    }

    // ===================================================
    // SKILLS
    // ===================================================

    if (activeTab === "Skills") {
      return (
        <div className="content-card compact-card">
          <div className="section-heading">
            <h2>Skills</h2>
            <p className="muted">
              Skills identified from your resume.
            </p>
          </div>

          <div className="chips">
            {resume.skills?.length > 0 ? (
              resume.skills.map((skill, index) => (
                <span key={index}>{skill}</span>
              ))
            ) : (
              <p className="muted">No skills found.</p>
            )}
          </div>
        </div>
      );
    }

    // ===================================================
    // EDUCATION
    // ===================================================

    if (activeTab === "Education") {
      return (
        <div className="content-card compact-card">
          <div className="section-heading">
            <h2>Education</h2>
          </div>

          {resume.education?.length > 0 ? (
            resume.education.map((item, index) => (
              <div className="detail-item" key={index}>
                <strong>
                  {item.degree || "Education"}
                </strong>

                {item.institution && (
                  <p>{item.institution}</p>
                )}

                {(item.startYear || item.endYear) && (
                  <span className="muted">
                    {item.startYear || ""}
                    {item.startYear && " - "}
                    {item.endYear || "Present"}
                  </span>
                )}

                {item.percentage && (
                  <p>
                    Percentage: {item.percentage}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="muted">
              No education information found.
            </p>
          )}
        </div>
      );
    }

    // ===================================================
    // PROJECTS
    // ===================================================

    if (activeTab === "Projects") {
      return (
        <div className="content-card compact-card">
          <div className="section-heading">
            <h2>Projects</h2>
            <p className="muted">
              Projects mentioned in the resume.
            </p>
          </div>

          {resume.projects?.length > 0 ? (
            resume.projects.map((item, index) => (
              <div className="detail-item project-item" key={index}>

                <strong>
                  {item.name || "Unnamed Project"}
                </strong>

                {item.link && (
                  <p>
                    <strong>Link:</strong>{" "}
                    {item.link}
                  </p>
                )}

                {Array.isArray(item.description) ? (
                  <ul>
                    {item.description.map(
                      (description, descriptionIndex) => (
                        <li key={descriptionIndex}>
                          {description}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  item.description && (
                    <p>{item.description}</p>
                  )
                )}
              </div>
            ))
          ) : (
            <p className="muted">
              No projects found.
            </p>
          )}
        </div>
      );
    }

    // ===================================================
    // JD MATCH
    // ===================================================

    if (activeTab === "JD Match") {
      return renderJDMatch();
    }

    // ===================================================
    // ABOUT
    // ===================================================

    return (
      <div className="content-card compact-card">
        <div className="section-heading">
          <h2>About Candidate</h2>
        </div>

        <div className="about-grid">
          <div>
            <span>Name</span>
            <strong>
              {resume.name || "N/A"}
            </strong>
          </div>

          <div>
            <span>Email</span>
            <strong>
              {resume.email || "N/A"}
            </strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>
              {resume.phone || "N/A"}
            </strong>
          </div>

          <div>
            <span>Experience</span>
            <strong>
              {resume.experience?.length || 0} entries
            </strong>
          </div>
        </div>

        <h3>Summary</h3>

        <p>
          {resume.summary || "No summary available."}
        </p>
      </div>
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="dashboard">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="sidebar-top">
          <h1>RESUMATE</h1>

          <p className="subtitle">
            AI Resume Assistant
          </p>
        </div>

        <div className="profile">

          <div className="avatar">
            {resume?.name?.charAt(0)?.toUpperCase() || "R"}
          </div>

          <h2>
            {resume?.name || "Your Resume"}
          </h2>

          <p>
            {resume
              ? "AI Analyzed Candidate"
              : "Upload Resume"}
          </p>

        </div>

        <div className="upload-box">

          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setFile(e.target.files[0]);
            }}
          />

          <button
            onClick={analyzeResume}
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze Resume"}
          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN PANEL
      ================================================= */}

      <main className="main-panel">

        {/* HERO */}

        <section className="hero">
          <h2>
    Hello <span>👋</span>
  </h2>

  <p>
    Ask me anything about the candidate’s{" "}
    <strong>education, skills, projects, experience</strong> or{" "}
    <strong>job suitability</strong>.
  </p>
</section>

        {/* TABS */}

        <nav className="tabs">
          {[
            "About",
            "Skills",
            "Projects",
            "Education",
            "JD Match",
          ].map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* CONTENT */}

        <section className="content-area">
          {renderContent()}
        </section>

        {/* =================================================
            AI CHAT
        ================================================= */}

        <section className="chat-section">

          <div className="chat-header">
            <div>
              <h3>AI Assistant</h3>
              <span>
                Ask questions about your resume
              </span>
            </div>
          </div>

          {/* ONLY CHAT AREA SCROLLS */}

          <div className="chat-answer">

            <div className="chat-history">

              {chatHistory.length === 0 ? (

                <div className="ai-message">
                  <span>AI ASSISTANT</span>

                  <p>
                    Ask anything about the uploaded resume.
                  </p>
                </div>

              ) : (

                chatHistory.map((chat, index) => (

                  <div
                    className="chat-message"
                    key={index}
                  >

                    {/* USER */}

                    <div className="user-message">
                      <span>YOU</span>

                      <p>
                        {chat.question}
                      </p>
                    </div>

                    {/* AI */}

                    <div className="ai-message">
                      <span>AI ASSISTANT</span>

                      <p>
                        {chat.answer}
                      </p>
                    </div>

                  </div>

                ))

              )}

            </div>
          </div>

          {/* CHAT INPUT */}

          <div className="chat-input">

            <input
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  askAI();
                }
              }}
              placeholder="Ask anything about the candidate..."
              disabled={chatLoading}
            />

            <button
              onClick={askAI}
              disabled={chatLoading}
            >
              {chatLoading
                ? "..."
                : "Send"}
            </button>

          </div>

        </section>

      </main>
    </div>
  );
}

export default App;