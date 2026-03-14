import { translatePage } from "../utils/pageTranslator"

export default function LanguageSwitcher() {

    return (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999 }}>
            <button onClick={() => translatePage("en")}>English</button>
            <button onClick={() => translatePage("hi")}>Hindi</button>
            <button onClick={() => translatePage("kn")}>Kannada</button>
            <button onClick={() => translatePage("ta")}>Tamil</button>
            <button onClick={() => translatePage("te")}>Telugu</button>
        </div>
    )
}