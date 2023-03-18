import "./Markdown.css"
import React from 'react';
import SyntaxHighlighter from "react-syntax-highlighter";
import {atomOneLight} from "react-syntax-highlighter/dist/cjs/styles/hljs";
import rehypeRaw from 'rehype-raw';
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";

function Markdown(props) {
    return (<ReactMarkdown
        components={{
            code({inline, className, children, ...props}) {
                let lang = ""
                const match = /language-(\w+)/.exec(className || "")
                if (match) {
                    lang = match[1]
                }
                return !inline ?
                    <SyntaxHighlighter
                        children={String(children).replace(/\n$/, "")}
                        language={lang}
                        style={atomOneLight}
                        {...props}
                    />
                    : <code className="inlineCode" {...props}>
                        {children}
                    </code>
            }
        }}
        linkTarget="_blank"
        className="markdown"
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}>
        {props.content}
    </ReactMarkdown>);
}

export default Markdown;