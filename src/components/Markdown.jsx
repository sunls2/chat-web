import "./Markdown.css"
import React from "react"
import SyntaxHighlighter from "react-syntax-highlighter"
import {atomOneLight} from "react-syntax-highlighter/dist/cjs/styles/hljs"
import remarkGfm from "remark-gfm"
import ReactMarkdown from "react-markdown"
import IconBtn from "./IconBtn"

function Markdown(props) {
    function copyClick(content) {
        navigator.clipboard.writeText(content)
        props.success("Already copied to clipboard.")
    }

    return (<ReactMarkdown
        components={{
            code({inline, className, children, ...props}) {
                let lang = ""
                const match = /language-(\w+)/.exec(className || "")
                if (match) {
                    lang = match[1]
                }
                return !inline ?
                    <div style={{position: "relative"}}>
                        <IconBtn
                            style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                            }}
                            onClick={() => copyClick(children[0])}
                            size="20px" src="icon/copy.svg"></IconBtn>
                        <SyntaxHighlighter
                            children={String(children).replace(/\n$/, "")}
                            language={lang}
                            style={atomOneLight}
                            {...props}
                        />
                    </div>
                    : <code className="inlineCode" {...props}>
                        {children}
                    </code>
            }
        }}
        linkTarget="_blank"
        className="markdown"
        remarkPlugins={[remarkGfm]}>
        {props.content}
    </ReactMarkdown>)
}

export default React.memo(Markdown)