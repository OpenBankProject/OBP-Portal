# Opey
## Intro
Transitioning to a more dynamic user experience is a big part of the move to a new portal. Less baked-in information and more on-demand, tailored guidance using LLMs. Therefore making sure that Opey, our Open-Bank-Project-aware chatnot and agent, is working smoothly and efficiently, and can be deployed in a number of different ways is of high priority.

## Authenticating
As Opey is a seperate service to OBP-API, the sessions are managed seperately. Opey allows for anonymous, rate-limited (and request-limited) sessions for users to try it out. But users will need to authenticate after a while. 

The only currently supported method of authentication is using [consents](https://apiexplorer-ii-sandbox.openbankproject.com/glossary#Consent). Two things will need to be set for this flow to work:

- `PUBLIC_OPEY_CONSUMER_ID` will need to be set in the environment variables, so you will need to know what the Opey Consumer ID is on your OBP isntance
- The **OBP API** props needs also to be set: 
    ```json
    skip_consent_sca_for_consumer_id_pairs=[{ \
        "grantor_consumer_id": "<Portal Consumer ID>", \
        "grantee_consumer_id": "<Opey Consumer ID>" \
    }]
    ```
    the portal consumer ID should be found in API manager etc.



Once the user has logged in to the portal, and the OpeyChat component is mounted (see `lib/components/OpeyChat.svelte`). The user will make a consent at OBP-API, which is sent to Opey in exchange for a session.

## Architecture
Built with reusability, flexibility, and modularity, we have tried to adhere as best as possible to SOLID design principles, and used [design patterns](https://refactoring.guru/design-patterns) where applicable.

Opey frontend is divided into State, Services, Controllers and Types. On a basic level, controllers orchestrate between services, which _do stuff_ and state which _knows stuff_.
