import BaseLayout from "@/components/layouts/BaseLayout";
import BasePage from "@/components/BasePage"
import { useGetPortfolio} from "@/actions";
import { useGetPortfolioById} from "@/actions";
import { useRouter } from "next/router"
import { useUser } from '@auth0/nextjs-auth0';


const Portfolio = ({portfolio: repo}) => {
    //const router = useRouter();
    //const { data: repo, error, loading } = useGetPortfolioById(router.query.id);
    const { user, isLoading } = useUser();
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                {
                    loading && <p>Loading Data</p>
                }
                {error &&   
                    <div className="alert alert-danger">{error.message}</div>
                }
                {repo &&
                    <>
                        <h1>{repo.name}</h1>
                        <h2>{repo.description}</h2>
                    </>
                }
            </BasePage>

        </BaseLayout>
    )
}

//executed at build time
//  export async function getStaticPaths(){
//     const {data} = useGetPortfolio();

//     //get paths we want to pre-render based on portfolio ID
//     const paths = data.map(portfolio =>{
//         return {
//             params: {id: portfolio.id}
//         }
//     })
//     //fallback: false means that page not found will be a 404 pageø
//     return {paths, fallback:false}
// }

// export async function getStaticProps({params}){
//     const {data} = useGetPortfolioById(params.id);
//     return {props : {data}}
// }

export default Portfolio;