export const ADOPTION_GUIDES: Record<string, string> = {
  overview: `# How Rescue Dog Adoption Works

Adopting a rescue dog from Europe is a rewarding experience. Here's what you need to know:

## The Process

1. **Browse Available Dogs**
   Use rescuedogs.me to search dogs from vetted rescue organizations across Europe and the UK.

2. **Submit an Application**
   When you find a dog you like, click their adoption link to apply directly with the rescue organization.

3. **Home Check**
   Most rescues require a home check (in-person or virtual) to ensure your home is suitable.

4. **Meet & Greet**
   Some rescues arrange meet-and-greets. For international adoptions, this may be via video call.

5. **Transport Arranged**
   Once approved, the rescue coordinates transport via approved pet transport services.

6. **Welcome Home!**
   Your new family member arrives with all veterinary documentation.

*Use rescuedogs_get_adoption_guide(topic: "transport") for transport details.*
*Use rescuedogs_get_adoption_guide(topic: "fees") for fee information.*`,

  transport: `# Dog Transport Options

## For UK/EU Adoptions

### Pet Transport Services
- Professional pet couriers transport dogs safely across Europe
- Climate-controlled vehicles with regular rest stops
- Typical journey: 2-5 days depending on origin

### PETS Scheme (UK)
Since Brexit, dogs entering the UK must:
- Have a microchip (ISO 11784/11785)
- Valid rabies vaccination (21+ days before travel)
- Tapeworm treatment (24-120 hours before arrival)
- Animal Health Certificate (AHC) from an Official Veterinarian

### EU Pet Passport
Dogs traveling within the EU use the EU Pet Passport system:
- Microchip identification
- Rabies vaccination record
- Any additional treatments required by destination

### Typical Timeline
- Application approval: 1-2 weeks
- Veterinary preparation: 2-4 weeks
- Transport booking: 1-2 weeks
- Total: 4-8 weeks typical

*Most rescues handle all paperwork and transport logistics for you.*`,

  fees: `# Adoption Fees Explained

## What's Typically Included

### Standard Adoption Fee: £200-500 (varies by organization)

This usually covers:
- **Vaccinations:** Core vaccines (DHPP, rabies)
- **Microchip:** Permanent identification
- **Spay/Neuter:** If old enough
- **Deworming:** Internal parasite treatment
- **Flea/Tick:** External parasite treatment
- **Health Check:** Veterinary examination
- **EU Pet Passport/AHC:** Required documentation

### Transport Fee: £100-300 (varies by distance)

- Professional pet transport services
- Vehicle-based transport (not air)
- Often included or partially subsidized

### What You'll Pay

| Item | Typical Cost |
|------|-------------|
| Adoption Fee | £200-400 |
| Transport | £100-300 |
| **Total** | **£300-700** |

*Fees support the rescue's ongoing work saving more dogs.*`,

  requirements: `# Adoption Requirements

## Standard Requirements

### Home Assessment
- Safe, secure garden (fencing requirements vary)
- Dog-friendly environment
- No rental restrictions on pets
- Suitable space for dog's size

### Household Agreement
- All household members agree to adoption
- Existing pets are compatible (sometimes intro required)
- Plan for dog during work hours

### Experience Considerations
Some dogs may require:
- Previous dog ownership experience
- Homes without small children
- No cats or other small animals
- Experienced handlers only

### Practical Requirements
- Valid ID and proof of address
- Ability to pay adoption fee upfront
- Agree to post-adoption check-ins
- Home visit (virtual or in-person)

*Each rescue has specific requirements. Read individual dog profiles carefully.*`,

  timeline: `# Typical Adoption Timeline

## Week by Week

### Week 1-2: Application
- Browse available dogs on rescuedogs.me
- Submit application to rescue
- Initial screening call/questionnaire

### Week 2-3: Home Check
- Virtual or in-person home assessment
- Answer questions about your home and lifestyle
- Discuss specific dog's needs

### Week 3-4: Approval & Matching
- Application approved
- Dog officially reserved for you
- Adoption contract signed

### Week 4-6: Veterinary Prep
- Dog receives final health checks
- Vaccinations completed
- Documentation prepared
- Rabies observation period (if required)

### Week 6-8: Transport
- Transport date confirmed
- Final paperwork completed
- Dog travels to you

### Week 8+: Welcome Home!
- Dog arrives at your home
- Settling-in period begins
- Post-adoption support from rescue

## Total Timeline: 6-10 weeks typical

*Some dogs available for faster adoption if already in foster in your country.*`,
} as const;

export const COUNTRY_SPECIFIC_GUIDES: Record<string, string> = {
  GB: `\n\n## UK-Specific Information\n\n- Dogs must enter through approved UK ports/airports\n- Animal Health Certificate required (replaced EU Pet Passport post-Brexit)\n- 21-day wait after rabies vaccination before travel\n- Tapeworm treatment required 1-5 days before arrival`,
  IE: `\n\n## Ireland-Specific Information\n\n- EU Pet Passport accepted from EU countries\n- Standard EU pet travel rules apply\n- Rabies vaccination and microchip required`,
  DE: `\n\n## Germany-Specific Information\n\n- EU Pet Passport system applies\n- Some states have breed-specific legislation\n- Dog tax (Hundesteuer) required in most municipalities`,
  FR: `\n\n## France-Specific Information\n\n- EU Pet Passport system applies\n- Category 1 & 2 dogs have additional requirements\n- Standard EU pet travel rules`,
} as const;
