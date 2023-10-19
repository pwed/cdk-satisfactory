import { useContext } from "react"
import { AuthContext } from "./AuthContext"
import { Link } from "react-router-dom"

export default function UserProfile() {
    const { user, signOut } = useContext(AuthContext)

    var userAttributes = Object.keys(user).map((key) => {
        return <p key={key}>{key}: {user[key]}</p>
    })


    return (
        <div>
            {user && (
                <div>
                    <h2>User Profile</h2>
                    {userAttributes}
                </div>
            )}
            <Link onClick={signOut}>Sign Out</Link>
        </div>
    )
}