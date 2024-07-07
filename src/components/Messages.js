import React, { useState, useEffect } from "react";
import axios from "axios";

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
    };

    fetchMessages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        "http://localhost:5001/messages",
        { content },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMessages([...messages, response.data.message]);
      setContent("");
    } catch (error) {
      console.error("Error adding message:", error);
    }
  };

  return (
    <div>
      <h2>Messages</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Message:</label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button type="submit">Add Message</button>
      </form>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>{message.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default Messages;
