import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useUser } from '@auth0/nextjs-auth0';

const Blog = () => {
    const { user, error, isLoading } = useUser();
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                <h1>I am blog page</h1>
            </BasePage>
        </BaseLayout>
    )
}
export default Blog;