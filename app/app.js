var config = { blogName: 'Any Problems'
             , hostName: 'madvib.es'
             , port: 80
             , authorName: 'Nishiyama Yuya'
             , copyright: "copyright 2010 Nishiyama Yuya all rights reserved."
             , email: 'nsy@ulz.nu'
             , description: 'On Loving Lambda.'
             , useGravatar: true
             , recentCount: 8
             , rssCount: 20
             , dirname: __dirname
             }
  , app = require('../lib/tinyblog').setup(config)
  , redirectTarget = [ '/201001040216_first-entry'
                     , '/201001080311_en_installing-erlang'
                     , '/201001172350_rack-as-design-pattern'
                     , '/201001060317_my_plan_of_2010'
                     , '/201001112321_get-gravater-with-haskell'
                     , '/201001080222_installing-erlang'
                     , '/201001132328_ghc-asm-trouble'
                     ]

redirectTarget.forEach(function(url) {
    app.get(url, function(req, res) {
        res.redirect(url.replace(/_/g, '-'), 301)
    })
})

app.run()
