import axios from "axios"

export default async (req, res) => {
  try {
    debugger
    const axiosRes = await axios.get(`${processs.env.GITHUB_API_URL}/repositories/${req.query.id}`,
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`
        },
        params: {
          state: 'close'
        }
      });
    const post = axiosRes.data;
    res.status(200).json(post);
  } catch (e) {
    console.error(e);
    res.status(e.status || 400).json({ message: 'Api error' });
  }
}
