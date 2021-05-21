import BaseLayout from "@/components/layouts/BaseLayout";
import BasePage from "@/components/BasePage"
import axios from "axios"
import { useRouter } from "next/router"

const Portfolio = ({ repo }) => {
    const router = useRouter();
    console.log(repo)
    return (
        <BaseLayout>
            <BasePage>
                <h1>{repo.name}</h1>
                <h2>{repo.description}</h2>
            </BasePage>
        </BaseLayout>
    )
}


Portfolio.getInitialProps = async ({ query }) => {
    let repo = {};
    try {
        console.log(query.id)
        const res = await axios.get(`https://api.github.com/repositories/${query.id}`)
        repo = res.data;
    } catch (e) {
        console.error(e)
    }
    return { repo: repo }
}
export default Portfolio;