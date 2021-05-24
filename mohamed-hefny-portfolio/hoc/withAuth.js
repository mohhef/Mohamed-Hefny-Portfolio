import { useUser } from '@auth0/nextjs-auth0';
import Redirect from '@/components/shared/redirect'

const withAuth = (Component) => {
    return (props) => {
        const { user, isLoading } = useUser();
        if (isLoading) {
            return <p>Loading...</p>
        }
        
        if (!user) {
            return <Redirect ssr to="/api/auth/login" />
        } else {
            return <Component user={user} isLoading={isLoading} {...props} />
        }

    }
}

export default withAuth;
