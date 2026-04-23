import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runDevQuestionBankIntegrityCheck } from "@/lib/question-bank-integrity";

runDevQuestionBankIntegrityCheck();

createRoot(document.getElementById("root")!).render(<App />);
