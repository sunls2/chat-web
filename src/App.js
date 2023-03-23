import "./App.css"
import React, {useEffect, useRef, useState} from "react"
import {Button, Card, Input, message, Typography} from "antd"

import ChatAPI from "./api/ChatAPI"
import Settings from "./components/Settings"
import {ConfigKey, HelpEmail, ShopURL, UseBing, UseChatGPT} from "./constant"
import {merge, throttle} from "lodash"
import Markdown from "./components/Markdown"
import IconBtn from "./components/IconBtn"
import Title from "./components/Title"
import Clear from "./components/Clear"
import Loading from "./components/Loading"
import {Element, scroller} from "react-scroll"

const Text = Typography

const scrollBottomRef = "scroll-bottom"
const scrollBodyRef = "scroll-body"
const scrollDuration = 500

const defaultConfig = {
    clientToUse: UseChatGPT,
    jailbreak: false,
    openaiApiKey: "",
    resendRetain: false,
}
const api = new ChatAPI()

function App() {
    const [messageApi, messageHolder] = message.useMessage()
    const [config, setConfig] = useState(merge(defaultConfig, JSON.parse(localStorage.getItem(ConfigKey))))
    const [chatList, setChatList] = useState([])

    const [inputText, setInputText] = useState("")
    const [typing, setTyping] = useState(false)
    const [lastSend, setLastSend] = useState()

    const scrollThrottle = useRef(throttle(scrollToBottom, scrollDuration))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(scrollThrottle.current, [chatList])

    useEffect(() => {
        console.debug("mount")
        return () => {
            console.debug("umount")
            saveConfig()
        }
    }, [])

    function saveConfig() {
        setConfig(config => {
            console.debug("save config:", config)
            localStorage.setItem(ConfigKey, JSON.stringify(config))
            return config
        })
    }

    function scrollToBottom() {
        scroller.scrollTo(scrollBottomRef, {
            duration: scrollDuration,
            smooth: true,
            containerId: scrollBodyRef
        })
    }

    function onSendClick() {
        onSend()
    }

    // then 和 catch 中共用的检查逻辑
    function checkLastChat(chatList) {
        if (chatList.length === 0) {
            return null
        }
        const last = chatList[chatList.length - 1]
        if (!last.typing && !last.loading) {
            return null
        }
        last.loading = false
        last.typing = false
        last.resend = true
        return last
    }

    function onSend({resend, e} = {}) {
        if (typing) {
            messageApi.warning("Typing in progress.")
            e?.preventDefault()
            return
        }
        const inputValue = resend || inputText
        if (!inputValue.trim()) {
            messageApi.warning("There is nothing.")
            e?.preventDefault()
            return
        }

        if (!resend) {
            setLastSend(inputValue)
            setInputText("")
            setChatList(chatList => {
                if (chatList.length !== 0) {
                    chatList[chatList.length - 1].resend = false
                }
                return [...chatList, {content: inputValue, right: true}]
            })
        }
        if (config.resendRetain && resend) {
            setChatList(chatList => {
                chatList[chatList.length - 1].resend = false
                return [...chatList]
            })
        }

        // loading
        setChatList(chatList => [...chatList, {loading: true}])
        setTyping(true)
        setTimeout(scrollToBottom, 0)
        api.conversation(inputValue, config, {
            onopen: () => {
                setChatList(chatList => {
                    if (chatList.length === 0) {
                        return chatList
                    }
                    let last = chatList[chatList.length - 1]
                    if (last.typing) {
                        return chatList
                    }
                    if (last.loading) {
                        last = {typing: true}
                    }
                    return [...chatList.slice(0, -1), last]
                })
            },
            onmessage: (message) => {
                setChatList(chatList => {
                    if (chatList.length === 0 || !chatList[chatList.length - 1].typing) {
                        return chatList
                    }
                    const last = chatList[chatList.length - 1]
                    last.content = message
                    return [...chatList.slice(0, -1), last]
                })
            }
        }).then(() => {
            setChatList(chatList => {
                const last = checkLastChat(chatList)
                if (!last) {
                    return chatList
                }

                if (config.clientToUse === UseChatGPT && !config.openaiApiKey) {
                    last.content = `${last.content}\n___\n*默认有\`max_tokens=${ChatAPI.limitTokens}\`限制，[购买账号](${ShopURL})可无限制使用*`
                }
                return [...chatList.slice(0, -1), last]
            })
        }).catch(err => {
            console.error("catch:", err)
            setChatList(chatList => {
                const last = checkLastChat(chatList)
                if (!last) {
                    return chatList
                }

                const errText = `❌ 哎呀出错啦！\`${err}\`  \n*请联系邮箱获取帮助：\`${atob(HelpEmail)}\`*`
                last.content = last.content
                    ? `${last.content}\n\n${errText}`
                    : errText
                return [...chatList.slice(0, -1), last]
            })
        }).finally(() => {
            console.debug("conversation finally")
            setTyping(false)
        })
    }

    function stopTyping() {
        api.controller?.abort()
        messageApi.success("Typing has stopped.")
    }

    function resend() {
        if (!config.resendRetain) {
            setChatList(chatList => {
                if (chatList.length === 0 || !chatList[chatList.length - 1].resend) {
                    return chatList
                }
                return [...chatList.slice(0, -1)]
            })
        }
        onSend({resend: lastSend})
    }

    function onClear() {
        api.clear()
        setChatList([])
        messageApi.success("New conversation started.")
    }

    // 记录是否正在输入，兼容中文输入的情况
    const [isComposition, setComposition] = useState(false)

    function handleComposition(e) {
        setComposition(e.type === "compositionstart")
    }

    function inputChange(e) {
        if (e.target.value === "\n") {
            return
        }
        setInputText(e.target.value)
    }

    function onPressEnter(e) {
        if (e.shiftKey) {
            e.preventDefault()
            setInputText(e.target.value + "\n")
            setTimeout(() => e.target.scrollTop = e.target.scrollHeight, 0)
            return
        }
        if (!isComposition) {
            onSend({e})
        }
    }

    const [modalOpen, setModalOpen] = useState(false)

    function settingsClose() {
        setModalOpen(false)
    }

    function updateConfig(newConfig) {
        setConfig(newConfig)
        saveConfig()
        if (config.clientToUse !== newConfig.clientToUse
            || (config.clientToUse === UseBing && config.jailbreak !== newConfig.jailbreak)) {
            onClear()
        }
    }

    return (<Card
            title={<Title {...{config, setModalOpen}}/>}
            style={{
                width: "96vw",
                maxWidth: "840px",
                minWidth: "200px",
                height: "98%",

                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
            }}
            actions={[
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "0 10px",
                }}>
                    <Clear {...{onClear}}/>
                    <Input.Group compact style={{display: "flex"}}>
                        <Input.TextArea
                            size="large"
                            maxLength={2000}
                            value={inputText}
                            autoFocus
                            autoSize={{maxRows: 1}}
                            onPressEnter={onPressEnter}
                            onCompositionStart={handleComposition}
                            onCompositionEnd={handleComposition}
                            onChange={inputChange}
                            style={{textAlign: "left"}}
                            placeholder="Ask me anything. 🙋‍♂️">
                        </Input.TextArea>
                        <Button size="large" onClick={onSendClick} type={"primary"}>Send</Button>
                    </Input.Group>
                    {typing ? <IconBtn onClick={stopTyping} src="icon/stop.svg" size="20px"/> : null}
                </div>
            ]}
            bodyStyle={{
                flex: 1,
                padding: "0 2%",
                overflowY: "auto",
                borderTop: "3px solid #82E0AA",
            }}
        >
            <Element id={scrollBodyRef} style={{
                height: "100%",
                display: "flex",
                flexFlow: "column nowrap",
                overflowY: "auto",
            }}>
                {chatList.length === 0 ?
                    <div style={{
                        flex: "1",
                        display: "flex",
                        flexFlow: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "30px",
                    }}>
                        <img className="empty-img"
                             src={`img/${config.clientToUse === UseBing ? UseBing : UseChatGPT}.png`} alt="empty"/>
                        <Text>{config.clientToUse === UseBing ?
                            "BingAI aids info search and Q&A."
                            : "ChatGPT is a large language model trained by OpenAI."}
                        </Text>
                    </div>
                    : chatList.map((item, i) => {
                        const style = {
                            marginTop: "10px",
                            display: "flex",
                            gap: "5px",
                        }
                        let emoji = "🤖"
                        if (item.right) {
                            style.justifyContent = "flex-end"
                            emoji = "🧐"
                        }

                        return <div style={style} key={i}>
                            <span style={{fontSize: "22px", marginTop: "-5px"}}>{emoji}</span>
                            <Card
                                style={{
                                    maxWidth: "85%",
                                    width: "fit-content",
                                }}
                                bodyStyle={{
                                    padding: "0 10px",
                                }}
                            >
                                {item.loading ?
                                    <Loading/>
                                    : <Markdown success={messageApi.success} content={item.content}/>}
                            </Card>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                }}
                            >
                                {item.right ? null :
                                    <div className={item.typing ? "gradient-loader" : ""}
                                         style={{width: "20px", height: "20px", flexShrink: 0}}/>}
                                {item.resend ?
                                    <IconBtn style={{marginBottom: "2px"}} onClick={resend} src="icon/resend.png"
                                             size="20px"/> : null}
                            </div>

                        </div>
                    })
                }
                <Element name={scrollBottomRef} style={{marginTop: "10px"}}></Element>
            </Element>
            {messageHolder}
            <Settings open={modalOpen} settingsClose={settingsClose} config={config} updateConfig={updateConfig}/>
        </Card>
    )
}

export default App
