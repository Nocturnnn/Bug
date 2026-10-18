# Iridescência

Atlas entomológico interativo com a borboleta do arquivo `borboleta_iridescente.glb`. A direção visual combina fundo escuro, membranas azuis e iridescentes, desenhos de medição e anotações de uma prancha científica.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Para gerar e conferir a versão de produção:

```sh
npm run build
npm run preview
```

O diretório `dist` contém o site estático, pronto para uma hospedagem como GitHub Pages, Netlify ou Vercel. Os caminhos de produção são relativos, permitindo servir o projeto em um subdiretório.

## Explorar

- Arraste para girar; use a roda do mouse ou o gesto de pinça para aproximar.
- Em telas de toque, o gesto vertical permite rolar a página; arraste na horizontal para girar.
- Com a visualização em foco, use as setas para girar, `+` e `−` para aproximar ou afastar, e `Home` para restaurar a câmera.
- Alterne entre as vistas Estudo, Dorsal e Perfil.
- Pause o movimento, revele a triangulação com Estrutura e ajuste a intensidade da luz.
- Amplie a área de observação ou consulte as notas de campo. `Esc` fecha ambos.
- Baixe o arquivo GLB pelo rodapé.

O movimento usa as animações do arquivo em uma faixa suave de voo. A visualização respeita a preferência do sistema por movimento reduzido e suspende a renderização fora da área visível ou com a aba em segundo plano. O site precisa de WebGL e apresenta uma opção de recarregamento em caso de falha gráfica.

## Desempenho

- Animação limitada a 30 quadros por segundo, ou 24 em dispositivos com recursos mais modestos.
- Renderização limitada a 800 mil pixels, ou 450 mil em dispositivos modestos, independentemente da resolução da tela.
- Redução automática da resolução e do limite de quadros se a máquina não acompanhar o ritmo.
- Nenhuma renderização contínua quando o espécime está pausado ou em Estrutura. Girar, aproximar, trocar de vista ou ajustar a luz atualiza a imagem e volta a deixá-la em repouso.
- Estrutura usa linhas sem iluminação, compartilha os vértices do modelo e desenha cada aresta indexada apenas uma vez. As linhas e seu material são preparados uma vez e reutilizados em todas as trocas.
- Materiais das asas compartilhados, transparência em uma passagem, reflexos em resolução menor e programas gráficos preparados antes da interação.

Em desenvolvimento, `/?profile` registra contadores do renderizador no atributo `data-profile` da visualização para conferir quadros, linhas e recursos. Esse diagnóstico é removido do build de produção.

### Testes de regressão

Com Node.js 22.12+:

```sh
npm test
```

Os testes verificam suspensão em repouso e fora de tela, limite em monitores de 144 Hz, orçamento de pixels, adaptação a quadros lentos e 100 trocas de Estrutura sobre o GLB real sem recriar materiais ou alterar sua geometria.

## Arquivos

- `src/App.tsx`: composição da prancha e controles.
- `src/ButterflyScene.tsx`: carregamento do modelo, iluminação, materiais e câmera.
- `src/styles.css`: tipografia, desenho técnico e versões responsivas.
- `public/models/borboleta_iridescente.glb`: modelo fornecido, preservado no formato original.

React, TypeScript, Vite e Three.js. Fontes e modelo são servidos pelo próprio site, sem serviços externos em tempo de execução. Os gráficos são interpretações artísticas; a quantidade de malhas e triângulos é calculada a partir do modelo carregado.

O `.gitignore` exclui dependências, builds, relatórios temporários e diretórios de ferramentas de IA.
