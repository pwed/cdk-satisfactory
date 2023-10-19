import { useState, useContext } from "react"
import { AuthContext } from "./AuthContext"
import { getSession } from "./auth";

export default function API({ path, method = "GET", label, async = false, description = "" }) {
    const [error, setError] = useState("")

    const { user, signIn } = useContext(AuthContext)

    const [responseBody, setBody] = useState("")

    const submit = async (e) => {
        const session = await getSession()
        setError("")

        let headers = {
            Authorization: `Bearer ${session.idToken.jwtToken}`,
        }
        if (async) {
            headers["InvocationType"] = "Event"
        }


        try {
            const response = await fetch(`https://api.admin.satisfactory.pwed.me${path}`, {
                method: method,
                headers,
            })
            setBody(await response.text())
        } catch (err) {
            setError(err.message)
        }
    }
    var style = {
        // border: "1px",
        // borderColor: "white",
        // borderStyle: "solid",
        // width: "30%",
        // display: "inline-block",
        // height: "200px",
        // margin: "5px",
        // padding: "1px", 
    }
    // Redirect to the profile page
    return (
        <div style={style}>
            <h4>{label}</h4>
            <p>{description}</p>
            <button onClick={submit}>{method}</button>
            <p>{responseBody}</p>
            {/* {error && <p>{error}</p>} */}
        </div>
    )
}