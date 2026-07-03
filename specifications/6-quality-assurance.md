# Quality Assurance
The following specification outlines the key functionality that must be validated for functionality prior to release.

## Prerequisites

Load the following skills plus any others that seem relevant — new ones may be added over time:
- `agent-ops` — running agent evals, adversarial testing, and interpreting response quality
- `build-time-gen-ai-evals` — scoring RAG faithfulness, answer relevance, and agentic tool-call accuracy

## Validate the backend endpoints
Perform testing of these sequences to ensure proper functionality.  Use either CURL, wget or python3.  For testing purposes, login with `james.smith@email.com` and password as `password`:

Example user journey to test:
1. Login as a user
2. Add 3 items to the cart
3. View the shopping cart then checkout 
4. View your order
5. Add 4 items to the cart
6. View the shopping cart then checkout 
7. View your orders to ensure both new order are present

## Validate website functionality
Once the backend API endpoints pass their tests, conduct a visual test of the website using the provided tools for taking website screenshots.  Visit all web pages and compare against all page design comps in @specifications/frontend/design-mockups.  Also ensure the product ordering flows work including login, adding products to cart via various buttons around the website, checking out and viewing orders.

Use the `website-screenshot-capture` tool to take screenshots to ensure correct visual implementation.  

### QA agentic search
Test these questions using the agentic search solution. The agent should reply with answers unique to the input question and detailed about why these products are a good fit:
1. What products do you recommend for entertaining my dog during the at trip?
2. What healthcare products are available for young adults?
3. Are their special communication devices for people with hearing loss?

### How to best use the website-screenshot-capture tool
The `website-screenshot-capture` requires an directory for storing its files. Create @frontend/qa-screenshots/ as a temporary folder to store the screenshots.  When providing this folder to `website-screenshot-capture`, you must provide the absolute directory path else an error will occur.  
* Ensure that you provide a random subdirectory name `xxxxx` so your image don't conflict with others.

## Track problem in @issues/
Any problems found during QA testing should be saved as in @issues/