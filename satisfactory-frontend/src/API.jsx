import { useState, useContext } from "react"
import { getSession } from "./auth";
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

export default function API({ path, method = "GET", label, description = "", async = false }) {
    const [error, setError] = useState("")

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
    // Redirect to the profile page
    return (
        <Card border="secondary" className="">
            <Card.Header>{label}</Card.Header>
            <Button variant="info" className="mt-2 mx-2" onClick={submit}>{method}</Button>
            <Card.Body>
                <Card.Subtitle className="mb-2">{description}</Card.Subtitle>
                <Card.Text>{responseBody}</Card.Text>
                {/* {error && <p>{error}</p>} */}
            </Card.Body>
        </Card>
    )
}