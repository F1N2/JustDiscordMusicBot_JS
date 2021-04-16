const fs = require('fs');

const File = {
    read:function(a,b) {
        try {
            return fs.readFileSync(a,b);
        } catch(e) {
            return null;
        }
    },
    save:function(a,c,d) {
        let b = a.split('/').pop();
        a = a.replace('/'+b,'');
        if(!fs.existsSync(a)) fs.mkdirSync(a);
        fs.writeFileSync(a+'/'+b,c,d);
        return true;
    },
    remove:function(a) {
        fs.unlinkSync(a);
        return true;
    }
}

module.exports = File;