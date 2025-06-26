"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator,
  ChevronsRight,
  ClipboardCopy,
  Copy,
  History,
  Mic,
  Moon,
  Save,
  Send,
  Share2,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  calculateAnswerWithVoiceText,
  CalculateAnswerInput,
} from "@/ai/flows/calculate-answer-with-voice-text";
import {
  suggestRelevantCalculations,
} from "@/ai/flows/suggest-relevant-calculations";

type HistoryEntry = {
  expression: string;
  result: string;
  date: string;
};

type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

// A simple and safe function to evaluate math expressions
const evaluate = (expression: string): string => {
  try {
    // Sanitize the expression to allow only numbers, operators, and parentheses
    const sanitized = expression.replace(/[^0-9+\-*/().% ]/g, "");
    if (sanitized !== expression) {
      throw new Error("Invalid characters in expression");
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized.replace(/%/g, '/100*')}`)();
    if (isNaN(result) || !isFinite(result)) {
      throw new Error("Invalid calculation");
    }
    return String(result);
  } catch (error) {
    return "Error";
  }
};

export default function Home() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentMode, setCurrentMode] = useState("standard");
  const { toast } = useToast();

  // AI State
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("smartcalc-history");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("smartcalc-history", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [history]);

  const getAiSuggestion = useCallback(async (calculationType: string) => {
    try {
      const suggestion = await suggestRelevantCalculations({
        currentCalculationType: calculationType,
        recentCalculationTypes: [], // In a real app, this would be populated from history
      });
      setAiSuggestion(suggestion.suggestedCalculation);
    } catch (error) {
      console.error("Suggestion Error:", error);
    }
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      if (result && !["+", "-", "*", "/", "%"].includes(value)) {
        setExpression(value);
        setResult("");
      } else {
        setExpression((prev) => prev + value);
      }
      setAiSuggestion("");
    },
    [result]
  );

  const calculateResult = useCallback(() => {
    if (!expression) return;
    const calculatedResult = evaluate(expression);
    setResult(calculatedResult);
    if (calculatedResult !== "Error") {
      const newEntry = {
        expression,
        result: calculatedResult,
        date: new Date().toISOString(),
      };
      setHistory((prev) => [newEntry, ...prev]);

      if (
        currentMode === "business" &&
        (expression.toLowerCase().includes("loan") ||
          expression.toLowerCase().includes("emi"))
      ) {
        getAiSuggestion("loan");
      }
      if (
        currentMode === "business" &&
        expression.toLowerCase().includes("discount")
      ) {
        getAiSuggestion("discount");
      }
    }
  }, [expression, currentMode, getAiSuggestion]);

  const clear = useCallback(() => {
    setExpression("");
    setResult("");
    setAiSuggestion("");
  }, []);

  const backspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Ignore key events if user is typing in an input field (like the AI input)
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      
      const { key } = event;
      
      // Allow copy-paste
      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'c') {
        return;
      }

      let isHandled = true;

      if (/[0-9]/.test(key) || ["/", "*", "-", "+", "."].includes(key)) {
        handleInput(key);
      } else if (["(", ")", "%"].includes(key)) {
        handleInput(key);
      } else if (key === "Enter" || key === "=") {
        calculateResult();
      } else if (key === "Backspace") {
        backspace();
      } else if (key.toLowerCase() === 'c' || key === 'Delete' || key === 'Escape') {
        clear();
      } else {
        isHandled = false;
      }

      if (isHandled) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleInput, calculateResult, backspace, clear]);

  const handleShare = async () => {
    const shareText = result
      ? `${expression} = ${result}`
      : "Check out SmartCalc AI!";
    if (navigator.share) {
      try {
        await navigator.share({ title: "SmartCalc AI Calculation", text: shareText });
      } catch (error) {
        // Fallback to clipboard if sharing fails
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Sharing failed",
          description: "The calculation has been copied to your clipboard.",
          variant: "default",
        });
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard!" });
    }
  };

  const handleHistoryClick = (entry: HistoryEntry) => {
    setExpression(entry.expression);
    setResult(entry.result);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `"${text}" has been copied to your clipboard.`,
    });
  };

  // AI Functionality
  const handleAiSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!aiInput.trim() || isTyping) return;

    const userMessage: AIMessage = { role: "user", content: aiInput };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setIsTyping(true);

    try {
      const response = await calculateAnswerWithVoiceText({ question: aiInput });
      const assistantMessage: AIMessage = {
        role: "assistant",
        content: response.answer,
      };
      setAiMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = {
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
      };
      setAiMessages((prev) => [...prev, errorMessage]);
      console.error("AI Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  // Voice Recognition Setup
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiInput(transcript);
        setIsRecording(false);
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: "Couldn't recognize speech.",
        });
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
    }
  }, [toast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
      });
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const renderKeypad = (mode: string) => {
    const buttons: (
      | string
      | { label: string; value: string; className?: string }
    )[] = [];

    const actionBtnClass = "bg-secondary hover:bg-secondary/80 text-primary";
    const equalsBtnClass =
      "bg-accent hover:bg-accent/80 text-accent-foreground row-span-2";

    switch (mode) {
      case "scientific":
        buttons.push(
          { label: "sin", value: "sin(" },
          { label: "cos", value: "cos(" },
          { label: "tan", value: "tan(" },
          { label: "C", value: "C", className: actionBtnClass },
          { label: "log", value: "log(" },
          { label: "ln", value: "ln(" },
          { label: "(", value: "(" },
          { label: ")", value: ")" },
          { label: "√", value: "sqrt(" },
          { label: "x²", value: "^2" },
          { label: "xʸ", value: "^" },
          { label: "π", value: "Math.PI" },
          "7",
          "8",
          "9",
          { label: "÷", value: "/", className: actionBtnClass },
          "4",
          "5",
          "6",
          { label: "×", value: "*", className: actionBtnClass },
          "1",
          "2",
          "3",
          { label: "-", value: "-", className: actionBtnClass },
          "0",
          ".",
          { label: "⌫", value: "backspace" },
          { label: "+", value: "+", className: actionBtnClass },
          {
            label: "=",
            value: "=",
            className: equalsBtnClass + " !col-start-4 !row-start-5 !row-span-2",
          }
        );
        break;
      case "business":
        const businessTextBtnClass = "text-sm text-center leading-normal";
        buttons.push(
          "C",
          "(",
          ")",
          {
            label: "DEL",
            value: "backspace",
            className: `${actionBtnClass} ${businessTextBtnClass}`,
          },
          { label: "EMI", value: "EMI", className: businessTextBtnClass },
          { label: "GST", value: "GST", className: businessTextBtnClass },
          {
            label: "Discount",
            value: "Discount",
            className: businessTextBtnClass,
          },
          { label: "÷", value: "/", className: actionBtnClass },
          "7",
          "8",
          "9",
          { label: "×", value: "*", className: actionBtnClass },
          "4",
          "5",
          "6",
          { label: "-", value: "-", className: actionBtnClass },
          "1",
          "2",
          "3",
          { label: "+", value: "+", className: actionBtnClass },
          "0",
          ".",
          "%",
          { label: "=", value: "=", className: equalsBtnClass }
        );
        break;
      case "standard":
      default:
        buttons.push(
          { label: "C", value: "C", className: actionBtnClass },
          { label: "%", value: "%", className: actionBtnClass },
          {
            label: "⌫",
            value: "backspace",
            className: actionBtnClass,
          },
          { label: "÷", value: "/", className: actionBtnClass },
          "7",
          "8",
          "9",
          { label: "×", value: "*", className: actionBtnClass },
          "4",
          "5",
          "6",
          { label: "-", value: "-", className: actionBtnClass },
          "1",
          "2",
          "3",
          { label: "+", value: "+", className: actionBtnClass },
          { label: "0", value: "0", className: "col-span-2" },
          ".",
          { label: "=", value: "=", className: equalsBtnClass }
        );
        break;
    }

    const gridClass =
      mode === "scientific" ? "grid-cols-4 grid-rows-7" : "grid-cols-4 grid-rows-5";

    return (
      <div className={`grid ${gridClass} gap-2 sm:gap-3 p-4`}>
        {buttons.map((btn, i) => {
          const label = typeof btn === "string" ? btn : btn.label;
          const value = typeof btn === "string" ? btn : btn.value;
          const className = typeof btn === "object" ? btn.className : "";

          let action;
          if (value === "=") action = calculateResult;
          else if (value === "C") action = clear;
          else if (value === "backspace") action = backspace;
          else action = () => handleInput(value);

          return (
            <CalcButton key={i} onClick={action} className={className}>
              {label}
            </CalcButton>
          );
        })}
      </div>
    );
  };

  const CalcButton = ({
    children,
    onClick,
    className = "",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
  }) => (
    <Button
      variant="ghost"
      className={`h-16 sm:h-20 text-2xl sm:text-3xl rounded-2xl transition-all duration-200 ease-in-out active:scale-95 focus:ring-2 ring-accent calc-button-neumorphism active:calc-button-neumorphism-inset ${className}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-2 sm:p-4 transition-colors duration-300">
      <main className="w-full max-w-md mx-auto bg-secondary/30 dark:bg-secondary/50 rounded-3xl shadow-2xl dark:shadow-black/50 overflow-hidden border border-border">
        <header className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="text-primary h-6 w-6" />
            <h1 className="text-xl font-bold text-foreground">SmartCalc AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <History className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Calculation History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100%-4rem)] mt-4">
                  {history.length > 0 ? (
                    history.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 mb-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => handleHistoryClick(item)}
                      >
                        <p className="text-sm text-muted-foreground truncate">
                          {item.expression}
                        </p>
                        <p className="text-lg font-semibold">{item.result}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.date).toLocaleString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.result);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground mt-8">
                      No history yet.
                    </p>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="px-4 pb-4">
          <div className="bg-background rounded-2xl p-4 min-h-[120px] text-right flex flex-col justify-end shadow-inner dark:shadow-black/30">
            <p className="text-muted-foreground text-2xl h-8 truncate animate-fade-in">
              {expression || " "}
            </p>
            <p className="text-foreground font-bold text-5xl h-14 animate-slide-in-bottom">
              {result || "0"}
            </p>
            {aiSuggestion && (
              <div className="text-left mt-2 animate-fade-in">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent"
                  onClick={() => {
                    setExpression(aiSuggestion);
                    setAiSuggestion("");
                  }}
                >
                  <ChevronsRight className="h-4 w-4 mr-2" />
                  Try: {aiSuggestion}
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs value={currentMode} onValueChange={setCurrentMode} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-secondary/80 dark:bg-secondary/70 mx-auto rounded-none h-14">
            <TabsTrigger value="standard" className="rounded-none">
              Standard
            </TabsTrigger>
            <TabsTrigger value="scientific" className="rounded-none">
              Scientific
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-none">
              Business
            </TabsTrigger>
            <TabsTrigger value="statistics" className="rounded-none">
              Statistics
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-none text-accent">
              AI
            </TabsTrigger>
          </TabsList>

          <div className="animate-fade-in">
            <TabsContent value="standard">
              {renderKeypad("standard")}
            </TabsContent>
            <TabsContent value="scientific">
              {renderKeypad("scientific")}
            </TabsContent>
            <TabsContent value="business">
              {renderKeypad("business")}
            </TabsContent>
            <TabsContent value="statistics">
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-4">
                  Ask AI for statistical calculations!
                </p>
                <Button onClick={() => setCurrentMode("ai")}>
                  Switch to AI Mode
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="ai">
              <div className="p-4 flex flex-col h-[380px] sm:h-[460px]">
                <ScrollArea className="flex-grow mb-4 pr-3">
                  <div className="space-y-4">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-end gap-2 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl p-3 max-w-xs sm:max-w-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-secondary text-secondary-foreground rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-end gap-2 justify-start">
                        <div className="rounded-2xl p-3 bg-secondary text-secondary-foreground rounded-bl-none">
                          <div className="flex gap-1 items-center">
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <form onSubmit={handleAiSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={
                      isRecording ? "Listening..." : "Ask me anything..."
                    }
                    className="flex-grow bg-background p-3 rounded-xl border-2 border-transparent focus:border-primary focus:ring-0 transition-colors"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={toggleRecording}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-accent hover:bg-accent/80"
                    disabled={isTyping}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
