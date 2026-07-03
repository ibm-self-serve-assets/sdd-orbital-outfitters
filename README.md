# Spec-Driven Retail Order Fulfillment
Use these `Specifications` to perform `Spec-Driven Development` and build a comprehensive retail website using [IBM Bob](https://bob.ibm.com/) and the [IBM Building Blocks](https://ibm-self-serve-assets.github.io/building-blocks-docs).  

Get started by asking Bob to:
```
Follow the instructions in @specifications/0-team-manager-ibm-building-blocks
```

Bob 2.0 will read [0-team-manager-ibm-building-blocks](specifications/0-team-manager-ibm-building-blocks.md) then spawn a team of subagents and delegate tasks so they rapidly and concurrently:
- [Spec 1:](specifications/1-generate-dataset.md) Expand the initial product and user dataset
- [Spec 2:](specifications/2-rag-chromadb.md) Embed product data and deploy to a vector DB
- [Spec 3:](specifications/3-backend-apis.md) Architect and build all backend API endpoints
- [Spec 4:](specifications/4-frontend-ui.md) Write all frontend code for Product Info, Shopping Cart, Account, Orders and Checkout
- [Spec 5:](specifications/5-agentic-product-search.md) Deploy a product agent to watsonx Orchestrate for multi-turn product search
- [Spec 6:](specifications/6-containerization-rancher.md) Containerize all services
- [Spec 7:](specifications/7-quality-assurance.md) QA final solution

After Bob ask approval to execute several commands over ~30 mins, you'll have this website.  You can greatly reduce clicking approvals by adding this [list of approved execute commands](specifications/extras/approved_execute_commands.json) to your `~/.bob/settings/settings.json`.

<img width="750" src="https://github.com/user-attachments/assets/42203ac6-afdb-40f6-a5ad-31e43338db7e" />

## Spec-Driven Development
What is `Spec-Driven Development` and `Specifications`?  Spec-Driven Development is the evolution from crafting complex and quirky prompts for 3-5 secs of LLM effort to straightforward technical instructions that guide frontier models how to autonomously design, build, test, and refine production-ready solutions over 30–60 mins

<img width="750" src="https://github.com/user-attachments/assets/2b1c2e98-c77d-4061-881c-88fd907637e4" />
