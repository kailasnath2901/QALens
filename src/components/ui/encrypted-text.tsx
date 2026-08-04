"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "!@#$%^&*():{};|,.<>/?";

export const EncryptedText = ({
  text,
  encryptedClassName,
  revealedClassName,
  revealDelayMs = 50,
}: {
  text: string;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealDelayMs?: number;
}) => {
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setRevealedChars((prev) => {
          if (prev < text.length) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, revealDelayMs);
    }, 500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, revealDelayMs]);

  return (
    <span>
      {text.split("").map((char, index) => {
        const isRevealed = index < revealedChars;
        const displayChar = isRevealed
          ? char
          : char === " "
          ? " "
          : isMounted 
            ? CHARS[Math.floor(Math.random() * CHARS.length)]
            : CHARS[index % CHARS.length];

        return (
          <motion.span
            key={index}
            className={cn(
              isRevealed ? revealedClassName : encryptedClassName,
              "transition-colors duration-100"
            )}
          >
            {displayChar}
          </motion.span>
        );
      })}
    </span>
  );
};
