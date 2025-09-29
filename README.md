# 🌿 CuraAI  

CuraAI is a healthcare products web application that helps users **discover, search, and get AI-powered recommendations** for supplements and medicines.  
It combines a traditional product catalog with an **AI chatbot** for personalized product guidance.  

🔗 **Live Demo:** [CuraAI on Vercel](https://cura-ai-gui.vercel.app/)  

---

## 📌 Features  

### 🔑 Authentication  
- User **signup & login** with JWT-based authentication.  
- Stores token securely and redirects users to the **Products page** after login.  
- Auth-protected routes → users must be logged in to browse products or chat with the AI assistant.  

### 🛒 Product Listing  
- Displays all healthcare products stored in **MongoDB**.  
- **Search options:**  
  - **Direct search:** Query products by name/title (e.g., “Vitamin C”).  
  - **AI intent search:** Uses AI to interpret user needs (e.g., “I have weak bones” → suggests calcium/bone supplements).  

### 🤖 AI Chat Support  
- Built-in **chat assistant** available on the Products page.  
- Users can ask product-related queries, such as:  
  - “Suggest vitamins for hair fall.”  
  - “What should I take for weak immunity?”  
- Chatbot responds with:  
  - Relevant product suggestions.  
  - Short explanations of why those products are recommended.  

---

## 🧑‍💻 Tech Stack  

- **Frontend:** [Next.js](https://nextjs.org/) (React-based, optimized for SSR/SSG)  
- **Backend:** [Nest.js](https://nestjs.com/) (scalable Node.js framework)  
- **Database:** [MongoDB](https://www.mongodb.com/) (product storage)  
- **AI Layer:** [LangGraph](https://github.com/langchain-ai/langgraph) + OpenAI APIs (for intent detection & reasoning)  

---

## 🚀 Getting Started  

### 1️⃣ Clone the repository  
```bash
git clone https://github.com/wasiiff/curaai.git
cd curaai
