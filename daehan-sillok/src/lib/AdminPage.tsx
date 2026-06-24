import React, { useState } from "react";

type AdminTab = "history" | "myth";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("history");

  const [historyData, setHistoryData] = useState({
    title: "",
    dynasty: "",
    description: "",
    coverColor: "",
    accentColor: "",
  });

  const [mythData, setMythData] = useState({
    name: "",
    category: "",
    tagline: "",
    description: "",
    habits: "",
    origin: "",
  });

  const saveHistory = async () => {
    console.log("역사 저장", historyData);

    alert("저장 완료");

    setHistoryData({
      title: "",
      dynasty: "",
      description: "",
      coverColor: "",
      accentColor: "",
    });
  };

  const saveMyth = async () => {
    console.log("설화 저장", mythData);

    alert("저장 완료");

    setMythData({
      name: "",
      category: "",
      tagline: "",
      description: "",
      habits: "",
      origin: "",
    });
  };

  const inputStyle = {
    backgroundColor: "white",
    color: "black",
    border: "1px solid #ccc",
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>대한실록 관리자 페이지</h1>

      <hr />

      <div style={{ marginBottom: "20px" }}>
        <button style={inputStyle} onClick={() => setTab("history")}>
          역사 추가
        </button>

        <button
          onClick={() => setTab("myth")}
          style={inputStyle}
        //   style={{ marginLeft: "10px"}}
        >
          설화 추가
        </button>
      </div>

      {tab === "history" && (
        <div>
          <h2>역사 기록 추가</h2>

          <div>
            <label>제목</label>
            <br />
            <input
                style={inputStyle}
                value={historyData.title}
                onChange={(e) =>
                    setHistoryData({
                    ...historyData,
                    title: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>시대</label>
            <br />
            <input
            style={inputStyle}
              value={historyData.dynasty}
              onChange={(e) =>
                setHistoryData({
                  ...historyData,
                  dynasty: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>설명</label>
            <br />
            <textarea
            style={inputStyle}
              rows={8}
              cols={60}
              value={historyData.description}
              onChange={(e) =>
                setHistoryData({
                  ...historyData,
                  description: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>표지 색상</label>
            <br />
            <input
            style={inputStyle}
              value={historyData.coverColor}
              onChange={(e) =>
                setHistoryData({
                  ...historyData,
                  coverColor: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>강조 색상</label>
            <br />
            <input
            style={inputStyle}
              value={historyData.accentColor}
              onChange={(e) =>
                setHistoryData({
                  ...historyData,
                  accentColor: e.target.value,
                })
              }
            />
          </div>

          <br />

          <button style={inputStyle} onClick={saveHistory}>
            역사 저장
          </button>
        </div>
      )}

      {tab === "myth" && (
        <div>
          <h2>설화 · 신화 추가</h2>

          <div>
            <label>이름</label>
            <br />
            <input
            style={inputStyle}
              value={mythData.name}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  name: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>분류</label>
            <br />
            <input
            style={inputStyle}
              value={mythData.category}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  category: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>한줄 설명</label>
            <br />
            <input
            style={inputStyle}
              value={mythData.tagline}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  tagline: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>설명</label>
            <br />
            <textarea
            style={inputStyle}
              rows={8}
              cols={60}
              value={mythData.description}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  description: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>습성</label>
            <br />
            <textarea
            style={inputStyle}
              rows={4}
              cols={60}
              value={mythData.habits}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  habits: e.target.value,
                })
              }
            />
          </div>

          <br />

          <div>
            <label>출처</label>
            <br />
            <input
            style={inputStyle}
              value={mythData.origin}
              onChange={(e) =>
                setMythData({
                  ...mythData,
                  origin: e.target.value,
                })
              }
            />
          </div>

          <br />

          <button onClick={saveMyth} style={inputStyle}>
            설화 저장
          </button>
        </div>
      )}
    </div>
  );
}