import { useContext } from "react"
import { AuthContext } from "./AuthContext"

export default function UserProfile() {
    const { user, signOut } = useContext(AuthContext)

    var userAttributes = Object.keys(user).map((key) => {
        return <p>{key}: {user[key]}</p>
    })


    return (
        <div>
            {user && (
                <div>
                    <h2>User Profile</h2>
                    {userAttributes}
                </div>
            )}
            <button onClick={signOut}>Sign Out</button>
        </div>
    )
}